import dotenv from 'dotenv';
dotenv.config();

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  REDIS_URL?: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  ETHEREAL_USER: string;
  ETHEREAL_PASS: string;
  ELASTICSEARCH_URL: string;
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  SLACK_REDIRECT_URI: string;
  WORKER_CONCURRENCY: number;
  MAX_EMAILS_PER_HOUR_PER_SENDER: number;
  MIN_DELAY_BETWEEN_SENDS_MS: number;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback',
  ETHEREAL_USER: process.env.ETHEREAL_USER || '',
  ETHEREAL_PASS: process.env.ETHEREAL_PASS || '',
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || 'http://localhost:5001/api/slack/callback',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
  MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50', 10),
  MIN_DELAY_BETWEEN_SENDS_MS: parseInt(process.env.MIN_DELAY_BETWEEN_SENDS_MS || '2000', 10),
};
