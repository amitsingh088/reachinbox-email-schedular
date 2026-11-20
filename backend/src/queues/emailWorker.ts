import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';
import prisma from '../config/database';
import { sendEmail } from '../services/emailService';
import { checkRateLimit, incrementRateLimit } from '../services/rateLimiter';
import { updateEmailIndex } from '../services/searchService';
import { sendSlackNotification } from '../services/slackService';
import emailQueue from './emailQueue';

export interface EmailJobData {
  emailId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  userId: string;
}

const processEmailJob = async (job: Job<EmailJobData>): Promise<void> => {
  const { emailId, sender, recipient, subject, body, userId } = job.data;

  console.log(`📧 Processing job ${job.id} | Email ${emailId} → ${recipient}`);

  try {
    // 1. Fetch email from DB — idempotency check
    const email = await prisma.email.findUnique({ where: { id: emailId } });

    if (!email) {
      console.warn(`⚠️  Email ${emailId} not found in DB, skipping.`);
      return;
    }

    if (email.status === 'SENT') {
      console.log(`✅ Email ${emailId} already SENT, skipping (idempotent).`);
      return;
    }

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(sender);

    if (!rateLimitResult.allowed) {
      console.log(`⏳ Rate limited for sender ${sender}. Rescheduling in ${rateLimitResult.retryAfterMs}ms`);

      // Send Slack notification if user has webhook
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.slackWebhookUrl) {
        await sendSlackNotification(user.slackWebhookUrl, {
          sender,
          limit: rateLimitResult.limit,
          currentCount: rateLimitResult.currentCount,
          nextWindowMs: rateLimitResult.retryAfterMs,
        });
      }

      // Reschedule job with delay into the next hour window
      const newScheduledTime = new Date(Date.now() + rateLimitResult.retryAfterMs);
      const rescheduledJob = await emailQueue.add(
        `email-${emailId}`,
        job.data,
        {
          delay: rateLimitResult.retryAfterMs,
          jobId: `email-${emailId}-retry-${Date.now()}`,
        }
      );

      // Update email status and new scheduledAt in DB
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'RATE_LIMITED',
          scheduledAt: newScheduledTime,
          jobId: rescheduledJob.id,
        },
      });

      return;
    }

    // 3. Update email status to SENDING
    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'SENDING' },
    });

    // 4. Send email
    const sendResult = await sendEmail({ from: sender, to: recipient, subject, body });

    // 5. Update email status to SENT
    const sentAt = new Date();
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt,
        previewUrl: typeof sendResult.previewUrl === 'string' ? sendResult.previewUrl : null,
      },
    });

    // 6. Increment rate limit counter
    await incrementRateLimit(sender);

    // 7. Update Elasticsearch index
    await updateEmailIndex(emailId, { status: 'SENT', sentAt: sentAt.toISOString() });

    console.log(`✅ Email ${emailId} sent successfully to ${recipient}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to send email ${emailId}:`, errorMessage);

    // Update email status to FAILED
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        errorMessage,
      },
    });

    throw error; // Re-throw so BullMQ retries according to backoff
  }
};

export const emailWorker = new Worker<EmailJobData>(
  'email-queue',
  processEmailJob,
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: {
      max: 1,
      duration: env.MIN_DELAY_BETWEEN_SENDS_MS,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

emailWorker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed: ${error.message}`);
});

emailWorker.on('error', (error) => {
  console.error('❌ Worker error:', error.message);
});

export default emailWorker;
