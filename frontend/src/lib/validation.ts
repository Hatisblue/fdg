// Password strength checker
export interface PasswordStrength {
  score: number // 0-4
  feedback: string[]
  isStrong: boolean
}

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) {
    score++
  } else {
    feedback.push('At least 8 characters')
  }

  if (password.length >= 12) {
    score++
  }

  // Complexity checks
  if (/[a-z]/.test(password)) {
    score++
  } else {
    feedback.push('Include lowercase letters')
  }

  if (/[A-Z]/.test(password)) {
    score++
  } else {
    feedback.push('Include uppercase letters')
  }

  if (/[0-9]/.test(password)) {
    score++
  } else {
    feedback.push('Include numbers')
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score++
  } else {
    feedback.push('Include special characters')
  }

  // Common password patterns
  const commonPatterns = [
    /password/i,
    /12345/,
    /qwerty/i,
    /admin/i,
    /letmein/i,
  ]

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score = Math.max(0, score - 2)
    feedback.push('Avoid common passwords')
  }

  return {
    score: Math.min(score, 4),
    feedback,
    isStrong: score >= 4,
  }
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

// Validate name (letters, spaces, hyphens only)
export function isValidName(name: string): boolean {
  return /^[a-zA-Z\s-]+$/.test(name) && name.trim().length > 0
}

// Check for SQL injection patterns
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*=.*(\bOR\b|\bAND\b)/gi,
  ]

  return sqlPatterns.some(pattern => pattern.test(input))
}

// Validate URL
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Rate limit check (client-side)
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore: Record<string, RateLimitEntry> = {}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore[key]

  if (!entry || entry.resetAt < now) {
    rateLimitStore[key] = {
      count: 1,
      resetAt: now + windowMs,
    }
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  }
}
