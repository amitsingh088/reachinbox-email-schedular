import prisma from '../config/database';
import emailQueue from './emailQueue';

/**
 * Reconciles scheduled emails in PostgreSQL with BullMQ queue on startup.
 * Guarantees persistence even if Redis crashed or was restarted:
 * 1. Finds all pending emails (SCHEDULED or RATE_LIMITED) in Postgres
 * 2. Checks if their job already exists in BullMQ (to prevent duplication)
 * 3. If missing from Redis, re-enqueues with correct remaining delay
 */
export const reconcileScheduledEmails = async (): Promise<void> => {
  try {
    console.log('🔄 Checking for pending scheduled emails to reconcile...');

    const pendingEmails = await prisma.email.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
      },
    });

    if (pendingEmails.length === 0) {
      console.log('✅ No pending emails to reconcile.');
      return;
    }

    console.log(`📋 Found ${pendingEmails.length} pending email(s) in database. Verifying queue state...`);

    let restoredCount = 0;

    for (const email of pendingEmails) {
      const jobId = email.jobId || `email-${email.id}`;
      const existingJob = await emailQueue.getJob(jobId);

      // If job already exists in Redis (waiting, delayed, or active), do not duplicate!
      if (existingJob) {
        continue;
      }

      // If job is missing in Redis, calculate remaining delay and re-enqueue
      const scheduledTime = new Date(email.scheduledAt).getTime();
      const delay = Math.max(0, scheduledTime - Date.now());

      const newJob = await emailQueue.add(
        `email-${email.id}`,
        {
          emailId: email.id,
          sender: email.sender,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          userId: email.userId,
        },
        {
          delay,
          jobId,
        }
      );

      // Ensure jobId is updated in DB
      if (email.jobId !== newJob.id) {
        await prisma.email.update({
          where: { id: email.id },
          data: { jobId: newJob.id },
        });
      }

      restoredCount++;
    }

    if (restoredCount > 0) {
      console.log(`✅ Successfully reconciled and re-enqueued ${restoredCount} pending email(s).`);
    } else {
      console.log('✅ All pending jobs already present in BullMQ queue.');
    }
  } catch (error) {
    console.warn('⚠️  Could not complete email job reconciliation on startup:', (error as Error).message);
  }
};
