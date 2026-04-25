/**
 * Simple In-Memory Rate Limiter
 * For production, use Redis or a similar store.
 */

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export interface RateLimitOptions {
  limit: number;      // Maximum requests
  windowMs: number;   // Time window in milliseconds
}

export function rateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier) || { count: 0, lastReset: now };

  // Reset if window has passed
  if (now - userLimit.lastReset > options.windowMs) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }

  userLimit.count++;
  rateLimitMap.set(identifier, userLimit);

  return {
    success: userLimit.count <= options.limit,
    remaining: Math.max(0, options.limit - userLimit.count),
    reset: userLimit.lastReset + options.windowMs,
  };
}
