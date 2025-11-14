import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';
import { AppError } from './errorHandler';
import { AuditService } from '../services/audit.service';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  handler?: (req: Request, res: Response) => void; // Custom handler
}

/**
 * Advanced Redis-based rate limiter
 */
export function advancedRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    handler = defaultHandler,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `ratelimit:${keyGenerator(req)}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set to track requests in time window
      const multi = redisClient.multi();

      // Remove old requests outside the window
      multi.zRemRangeByScore(key, 0, windowStart);

      // Add current request
      multi.zAdd(key, { score: now, value: `${now}` });

      // Count requests in current window
      multi.zCard(key);

      // Set expiry
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const count = results ? (results[2] as number) : 0;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      if (count > max) {
        // Log rate limit exceeded
        await AuditService.logSecurity(
          'RATE_LIMIT_EXCEEDED',
          req.ip,
          req.headers['user-agent'],
          {
            key,
            count,
            limit: max,
            userId: req.user?.id,
          }
        );

        return handler(req, res);
      }

      // Store original end function
      const originalEnd = res.end;

      // Override end to check response status
      res.end = function (this: Response, ...args: any[]) {
        const statusCode = res.statusCode;

        // If we should skip this request, remove it from the count
        if (
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)
        ) {
          redisClient.zRem(key, `${now}`).catch(err => {
            logger.error('Failed to remove rate limit entry', { err, key });
          });
        }

        // Call original end
        return originalEnd.apply(this, args);
      };

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error });
      // On error, allow the request but log it
      next();
    }
  };
}

/**
 * Default key generator (IP + User ID if authenticated)
 */
function defaultKeyGenerator(req: Request): string {
  const userId = req.user?.id;
  const ip = req.ip;
  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Default rate limit exceeded handler
 */
function defaultHandler(req: Request, res: Response): void {
  throw new AppError(
    'Too many requests. Please try again later.',
    429
  );
}

/**
 * Specific rate limiters for different endpoints
 */

// Authentication endpoints - stricter limit
export const authRateLimiter = advancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  keyGenerator: (req) => `auth:${req.ip}`,
  skipSuccessfulRequests: true, // Only count failed login attempts
});

// AI generation endpoints - moderate limit
export const aiRateLimiter = advancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  keyGenerator: (req) => {
    const userId = req.user?.id || req.ip;
    return `ai:${userId}`;
  },
});

// Book creation - per user limit
export const bookCreationRateLimiter = advancedRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 books per hour
  keyGenerator: (req) => `book-create:${req.user?.id || req.ip}`,
});

// API general rate limit
export const apiRateLimiter = advancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
});

// Strict rate limit for sensitive operations
export const strictRateLimiter = advancedRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  keyGenerator: (req) => `strict:${req.ip}`,
});

/**
 * IP-based blocking for suspicious activity
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  try {
    const key = `blocked:ip:${ip}`;
    const blocked = await redisClient.get(key);
    return blocked === '1';
  } catch (error) {
    logger.error('Failed to check IP block status', { error, ip });
    return false;
  }
}

/**
 * Block an IP address
 */
export async function blockIP(
  ip: string,
  durationSeconds: number = 86400, // 24 hours default
  reason?: string
): Promise<void> {
  try {
    const key = `blocked:ip:${ip}`;
    await redisClient.setEx(key, durationSeconds, '1');

    await AuditService.logSecurity(
      'BLOCKED_IP',
      ip,
      undefined,
      { reason, duration: durationSeconds }
    );

    logger.warn('IP address blocked', { ip, duration: durationSeconds, reason });
  } catch (error) {
    logger.error('Failed to block IP', { error, ip });
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ip: string): Promise<void> {
  try {
    const key = `blocked:ip:${ip}`;
    await redisClient.del(key);
    logger.info('IP address unblocked', { ip });
  } catch (error) {
    logger.error('Failed to unblock IP', { error, ip });
  }
}

/**
 * Middleware to check if IP is blocked
 */
export const checkIPBlock = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ip = req.ip;
    const blocked = await isIPBlocked(ip!);

    if (blocked) {
      await AuditService.logSecurity(
        'BLOCKED_IP',
        ip,
        req.headers['user-agent'],
        { path: req.path }
      );

      throw new AppError('Access denied', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
