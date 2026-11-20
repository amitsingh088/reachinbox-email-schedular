import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';

const getRedisOptions = (): RedisOptions => {
  if (env.REDIS_URL) {
    const temp = new Redis(env.REDIS_URL, { lazyConnect: true });
    return {
      ...temp.options,
      maxRetriesPerRequest: null,
    };
  }
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
  };
};

export const redisConnection: RedisOptions = getRedisOptions();

export const createRedisClient = (): Redis => {
  return env.REDIS_URL
    ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
    : new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        maxRetriesPerRequest: null,
      });
};

// Shared Redis client for rate limiting and general use
export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL)
  : new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    });
