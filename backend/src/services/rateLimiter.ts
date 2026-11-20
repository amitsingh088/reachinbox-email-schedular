import { redis } from '../config/redis';
import { env } from '../config/env';

/**
 * Redis-based per-sender hourly rate limiter.
 * Key pattern: ratelimit:{sender}:{hourWindow}
 * Uses INCR + EXPIRE for thread-safe counting across workers.
 */

const getHourWindow = (timestamp?: number): number => {
  const ts = timestamp || Date.now();
  return Math.floor(ts / 3600000); // Hour window number
};

const getRateLimitKey = (sender: string, hourWindow?: number): string => {
  const window = hourWindow || getHourWindow();
  return `ratelimit:${sender}:${window}`;
};

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  retryAfterMs: number; // ms until next hour window
}

/**
 * Check if a sender can send another email this hour.
 * Returns whether allowed and when to retry if not.
 */
export const checkRateLimit = async (sender: string): Promise<RateLimitResult> => {
  const hourWindow = getHourWindow();
  const key = getRateLimitKey(sender, hourWindow);
  const limit = env.MAX_EMAILS_PER_HOUR_PER_SENDER;

  const currentCount = parseInt(await redis.get(key) || '0', 10);

  if (currentCount >= limit) {
    // Calculate time until next hour window
    const nextWindowStart = (hourWindow + 1) * 3600000;
    const retryAfterMs = nextWindowStart - Date.now();

    return {
      allowed: false,
      currentCount,
      limit,
      retryAfterMs: Math.max(retryAfterMs, 1000), // at least 1s
    };
  }

  return {
    allowed: true,
    currentCount,
    limit,
    retryAfterMs: 0,
  };
};

/**
 * Increment the rate limit counter for a sender.
 * Called AFTER successfully sending an email.
 */
export const incrementRateLimit = async (sender: string): Promise<number> => {
  const hourWindow = getHourWindow();
  const key = getRateLimitKey(sender, hourWindow);

  const count = await redis.incr(key);

  // Set expiry on first increment (3600 seconds = 1 hour)
  if (count === 1) {
    await redis.expire(key, 3600);
  }

  return count;
};

/**
 * Get current rate limit status for a sender (for API reporting).
 */
export const getRateLimitStatus = async (sender: string): Promise<{ currentCount: number; limit: number; remainingInWindow: number }> => {
  const hourWindow = getHourWindow();
  const key = getRateLimitKey(sender, hourWindow);
  const limit = env.MAX_EMAILS_PER_HOUR_PER_SENDER;

  const currentCount = parseInt(await redis.get(key) || '0', 10);

  return {
    currentCount,
    limit,
    remainingInWindow: Math.max(0, limit - currentCount),
  };
};
