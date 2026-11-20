import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import emailQueue from '../queues/emailQueue';
import { indexEmail, searchEmails } from '../services/searchService';
import { parseEmailFile } from '../utils/csvParser';

// POST /schedule — Schedule emails
export const scheduleEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sender, recipients: rawRecipients, subject, body, scheduledAt, delayBetweenMs = 2000, hourlyLimit } = req.body;

    if (!sender || !subject || !body || !scheduledAt) {
      res.status(400).json({ error: 'Missing required fields: sender, subject, body, scheduledAt' });
      return;
    }

    // Parse recipients from body or uploaded file
    let recipients: string[] = [];

    if (rawRecipients && Array.isArray(rawRecipients)) {
      recipients = rawRecipients;
    } else if (typeof rawRecipients === 'string') {
      try {
        const parsed = JSON.parse(rawRecipients);
        if (Array.isArray(parsed)) {
          recipients = parsed;
        } else {
          recipients = rawRecipients.split(',').map((r: string) => r.trim()).filter(Boolean);
        }
      } catch {
        recipients = rawRecipients.split(',').map((r: string) => r.trim()).filter(Boolean);
      }
    }

    // Handle file upload
    const file = req.file as Express.Multer.File | undefined;
    if (file) {
      const fileRecipients = parseEmailFile(file.buffer, file.mimetype);
      recipients = [...recipients, ...fileRecipients];
    }

    // Deduplicate
    recipients = [...new Set(recipients)];

    if (recipients.length === 0) {
      res.status(400).json({ error: 'No valid recipients provided' });
      return;
    }

    const batchId = crypto.randomUUID();
    const scheduledTime = new Date(scheduledAt).getTime();
    const createdEmails = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Create email in DB
      const email = await prisma.email.create({
        data: {
          userId,
          sender,
          recipient,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt: new Date(scheduledAt),
          batchId,
        },
      });

      // Calculate delay: scheduledAt - now + index * delayBetweenMs
      const delay = Math.max(0, scheduledTime - Date.now() + i * delayBetweenMs);

      // Add BullMQ delayed job
      const job = await emailQueue.add(
        `email-${email.id}`,
        {
          emailId: email.id,
          sender,
          recipient,
          subject,
          body,
          userId,
        },
        { delay, jobId: `email-${email.id}` }
      );

      // Update email with jobId
      await prisma.email.update({
        where: { id: email.id },
        data: { jobId: job.id },
      });

      // Index in Elasticsearch
      await indexEmail({
        id: email.id,
        userId,
        sender,
        recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: email.scheduledAt.toISOString(),
        createdAt: email.createdAt.toISOString(),
        batchId,
      });

      createdEmails.push(email);
    }

    res.status(201).json({
      message: `${createdEmails.length} email(s) scheduled successfully`,
      batchId,
      emails: createdEmails,
    });
  } catch (error) {
    console.error('❌ Error scheduling emails:', error);
    res.status(500).json({ error: 'Failed to schedule emails' });
  }
};

// GET /scheduled — Get user's scheduled emails
export const getScheduledEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const emails = await prisma.email.findMany({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ emails });
  } catch (error) {
    console.error('❌ Error fetching scheduled emails:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled emails' });
  }
};

// GET /sent — Get user's sent emails
export const getSentEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const emails = await prisma.email.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
    });

    res.json({ emails });
  } catch (error) {
    console.error('❌ Error fetching sent emails:', error);
    res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
};

// GET /search — Search emails via Elasticsearch
export const searchEmailsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const q = req.query.q as string;

    if (!q || q.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const results = await searchEmails(q, userId);
    res.json(results);
  } catch (error) {
    console.error('❌ Error searching emails:', error);
    res.status(500).json({ error: 'Failed to search emails' });
  }
};

// GET /stats — Get email stats for the user
export const getEmailStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [scheduled, sent, failed] = await Promise.all([
      prisma.email.count({
        where: { userId, status: { in: ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'] } },
      }),
      prisma.email.count({
        where: { userId, status: 'SENT' },
      }),
      prisma.email.count({
        where: { userId, status: 'FAILED' },
      }),
    ]);

    res.json({ scheduled, sent, failed });
  } catch (error) {
    console.error('❌ Error fetching email stats:', error);
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
};
