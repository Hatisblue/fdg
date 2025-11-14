import { logger } from './logger';

/**
 * Password strength validation
 */
export interface PasswordStrength {
  score: number;
  isStrong: boolean;
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  else feedback.push('Password must be at least 8 characters');

  if (password.length >= 12) score++;

  // Complexity checks
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Password must contain lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Password must contain uppercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Password must contain numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Password must contain special characters');

  // Check for common patterns
  const commonPatterns = [
    /password/i,
    /12345/,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push('Password contains common patterns');
  }

  // Check for sequential characters
  if (/abc|bcd|cde|123|234|345/i.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid sequential characters');
  }

  const isStrong = score >= 4;

  return {
    score: Math.min(score, 6),
    isStrong,
    feedback,
  };
}

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Additional checks
  if (email.length > 254) return false; // Max email length
  if (email.split('@')[0].length > 64) return false; // Max local part length

  return emailRegex.test(email);
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate name (letters, spaces, hyphens, apostrophes only)
 */
export function isValidName(name: string): boolean {
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name) && name.trim().length > 0 && name.length <= 100;
}

/**
 * Check for SQL injection patterns
 */
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/|xp_)/gi,
    /(\bOR\b|\bAND\b).*=.*(\bOR\b|\bAND\b)/gi,
    /UNION.*SELECT/gi,
  ];

  const hasSql = sqlPatterns.some(pattern => pattern.test(input));

  if (hasSql) {
    logger.warn('SQL injection attempt detected', { input: input.substring(0, 100) });
  }

  return hasSql;
}

/**
 * Check for XSS patterns
 */
export function hasXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<embed/gi,
    /<object/gi,
  ];

  const hasXss = xssPatterns.some(pattern => pattern.test(input));

  if (hasXss) {
    logger.warn('XSS attempt detected', { input: input.substring(0, 100) });
  }

  return hasXss;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate age range format
 */
export function isValidAgeRange(ageRange: string): boolean {
  const ageRangeRegex = /^\d{1,2}-\d{1,2}$/;
  if (!ageRangeRegex.test(ageRange)) return false;

  const [min, max] = ageRange.split('-').map(Number);
  return min >= 0 && max <= 18 && min < max;
}

/**
 * Validate language code (ISO 639-1)
 */
export function isValidLanguageCode(code: string): boolean {
  const validCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar'];
  return validCodes.includes(code.toLowerCase());
}

/**
 * Rate limit key generation
 */
export function generateRateLimitKey(identifier: string, action: string): string {
  return `ratelimit:${action}:${identifier}`;
}

/**
 * Validate file extension
 */
export function isAllowedImageExtension(filename: string): boolean {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(ext);
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size > 0 && size <= maxSizeBytes;
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate IP address
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
  }

  return ipv6Regex.test(ip);
}
