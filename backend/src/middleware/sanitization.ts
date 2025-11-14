import { Request, Response, NextFunction } from 'express';
import { sanitizeString, hasSQLInjection, hasXSS } from '../utils/validation';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Sanitize request body
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Sanitize request query parameters
 */
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check for malicious patterns in request
 */
export const checkMaliciousPatterns = (req: Request, res: Response, next: NextFunction) => {
  const checkValue = (value: any, path: string = '') => {
    if (typeof value === 'string') {
      if (hasSQLInjection(value)) {
        logger.warn('SQL injection attempt detected', {
          path,
          value: value.substring(0, 100),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError('Invalid input detected', 400);
      }

      if (hasXSS(value)) {
        logger.warn('XSS attempt detected', {
          path,
          value: value.substring(0, 100),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError('Invalid input detected', 400);
      }
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => {
        checkValue(val, `${path}.${key}`);
      });
    }
  };

  try {
    if (req.body) checkValue(req.body, 'body');
    if (req.query) checkValue(req.query, 'query');
    if (req.params) checkValue(req.params, 'params');

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate content length
 */
export const validateContentLength = (maxSize: number = 1048576) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      throw new AppError(`Request body too large. Maximum size is ${maxSize} bytes.`, 413);
    }

    next();
  };
};
