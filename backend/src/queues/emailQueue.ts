import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export default emailQueue;
