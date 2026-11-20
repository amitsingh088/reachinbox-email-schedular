import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import prisma from './config/database';
import { redis } from './config/redis';
import { initElasticsearch } from './config/elasticsearch';
import passport from './middleware/auth';

import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';

import emailQueue from './queues/emailQueue';
import { emailWorker } from './queues/emailWorker';
import { reconcileScheduledEmails } from './queues/jobRecovery';

const app = express();

// Middleware
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Bull Board — Queue monitoring dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('❌ Unhandled error:', err.message);
    res.status(500).json({
      error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  }
);

// Start server
const start = async (): Promise<void> => {
  try {
    // Initialize Elasticsearch index
    await initElasticsearch();

    // Reconcile pending scheduled emails from DB to ensure restart persistence
    await reconcileScheduledEmails();

    // Start listening
    const server = app.listen(env.PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
      console.log(`📊 Bull Board:  http://localhost:${env.PORT}/admin/queues`);
      console.log(`🔧 Environment: ${env.NODE_ENV}`);
      console.log(`👷 Worker concurrency: ${env.WORKER_CONCURRENCY}\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

      server.close();

      // Close the email worker
      await emailWorker.close();
      console.log('  ✅ Email worker closed');

      // Close the email queue
      await emailQueue.close();
      console.log('  ✅ Email queue closed');

      // Disconnect Prisma
      await prisma.$disconnect();
      console.log('  ✅ Database disconnected');

      // Close Redis
      redis.disconnect();
      console.log('  ✅ Redis disconnected');

      console.log('👋 Goodbye!\n');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
