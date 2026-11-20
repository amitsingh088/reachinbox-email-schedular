import Redis from 'ioredis';
import { env } from './env';

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
};

export const createRedisClient = (): Redis => {
  return new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
  });
};

// Shared Redis client for rate limiting and general use
export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
});
