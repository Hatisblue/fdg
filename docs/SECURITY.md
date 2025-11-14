# Security Documentation

## Overview

StoryCanvas implements enterprise-grade security measures following industry best practices for 2025. This document outlines all security features, configurations, and recommendations.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation & Sanitization](#input-validation--sanitization)
3. [Password Security](#password-security)
4. [Rate Limiting](#rate-limiting)
5. [Audit Logging](#audit-logging)
6. [Security Headers](#security-headers)
7. [Data Protection](#data-protection)
8. [AI Content Moderation](#ai-content-moderation)
9. [Network Security](#network-security)
10. [Incident Response](#incident-response)

---

## Authentication & Authorization

### JWT Token Management

- **Access Tokens**: Short-lived (7 days default), used for API authentication
- **Refresh Tokens**: Long-lived (30 days default), used to obtain new access tokens
- **Token Rotation**: Automatic token refresh when access token expires
- **Token Validation**: Includes issuer, audience, and expiration checks

```typescript
// Token structure
{
  userId: string,
  role: 'ADMIN' | 'PARENT' | 'CHILD',
  iss: 'storycanvas',
  aud: 'storycanvas-api',
  exp: timestamp
}
```

### Session Management

- **Secure Cookies**: HttpOnly, Secure, SameSite=Strict
- **Session Invalidation**: On logout and password change
- **Concurrent Session Limit**: Track active sessions per user
- **Auto-logout**: After 30 minutes of inactivity (frontend)

### Role-Based Access Control (RBAC)

- **ADMIN**: Full system access, moderation, analytics
- **PARENT**: Create books, manage children, subscription
- **CHILD**: Create books (with parent approval), view books

## Input Validation & Sanitization

### Server-Side Validation

All input is validated using Zod schemas and custom validators:

```typescript
// Example validation
validatePasswordStrength(password)  // Checks password complexity
isValidEmail(email)                 // RFC 5322 compliant
isValidName(name)                   // Letters, spaces, hyphens only
hasSQLInjection(input)              // Detects SQL patterns
hasXSS(input)                       // Detects XSS patterns
```

### Automatic Sanitization

- **String inputs**: Remove `<`, `>`, `javascript:`, event handlers
- **Email normalization**: Lowercase, trim whitespace
- **Name validation**: Letters, spaces, hyphens, apostrophes only
- **SQL/XSS Detection**: Automatic blocking with audit log

### Client-Side Validation

- **Real-time feedback**: Instant validation messages
- **Type safety**: TypeScript interfaces for all forms
- **Zod validation**: Shared schemas between frontend and backend

## Password Security

### Password Requirements

Passwords must meet ALL of the following criteria:

- ✅ Minimum 8 characters (12+ recommended)
- ✅ At least one lowercase letter
- ✅ At least one uppercase letter
- ✅ At least one number
- ✅ At least one special character
- ❌ Not a common password (password, 12345, qwerty, etc.)
- ❌ No sequential characters (abc, 123)

### Password Strength Scoring

```typescript
Score 0-1: Weak (rejected)
Score 2: Fair (rejected)
Score 3: Good (rejected)
Score 4+: Strong (accepted)
```

### Password Storage

- **Algorithm**: bcrypt
- **Cost Factor**: 12 rounds (configurable via `BCRYPT_ROUNDS`)
- **Salt**: Automatic per-password salt
- **Rainbow Table Protection**: High cost factor prevents pre-computation

### Password Reset

- **Secure Tokens**: UUID v4 tokens
- **Single Use**: Token invalidated after use
- **Expiration**: Tokens expire after 1 hour
- **Rate Limiting**: Max 3 reset requests per hour per IP
- **No User Enumeration**: Generic success message regardless of email existence

## Rate Limiting

### Redis-Based Rate Limiting

Uses sliding window algorithm with Redis sorted sets:

```typescript
// Authentication endpoints
15 minutes window, 5 attempts

// AI generation endpoints
1 minute window, 10 requests

// Book creation
1 hour window, 10 books

// General API
15 minutes window, 100 requests
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-11-14T12:00:00Z
```

### IP Blocking

Automatic blocking for suspicious activity:

- **Duration**: 24 hours default (configurable)
- **Triggers**:
  - Multiple failed login attempts
  - SQL injection attempts
  - XSS attempts
  - Rate limit violations (3x in 1 hour)
- **Unblocking**: Manual via admin API or automatic expiration

### Bypass Prevention

- **User + IP tracking**: Rate limits apply per user AND per IP
- **Distributed**: Redis-backed for horizontal scaling
- **Skip logic**: Successful requests don't count against auth rate limits

## Audit Logging

### What is Logged

Every significant action is logged:

- **Authentication**: Login, logout, registration, failed attempts
- **User Actions**: Book creation, publishing, deletion
- **AI Operations**: Story generation, image generation, moderation
- **Subscriptions**: Upgrades, downgrades, cancellations
- **Security Events**: Rate limit violations, blocked IPs, injection attempts
- **Admin Actions**: Content moderation, user management

### Log Structure

```typescript
{
  id: uuid,
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  ipAddress: string,
  userAgent: string,
  metadata: object,
  createdAt: timestamp
}
```

### Log Retention

- **Active Logs**: 90 days in database
- **Archives**: Compressed and stored for 7 years (GDPR compliance)
- **Automatic Cleanup**: Daily cron job removes old logs

### Accessing Logs

```bash
# Get user activity
GET /api/admin/audit/users/:userId

# Get resource history
GET /api/admin/audit/resources/:resource/:id

# Get security events
GET /api/admin/audit/security?hours=24
```

## Security Headers

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https: blob:;
connect-src 'self' https://api.openai.com https://api.stripe.com;
frame-src 'self' https://js.stripe.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

### Additional Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

### Cache Control

Sensitive endpoints use:
```
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

## Data Protection

### Encryption

- **In Transit**: TLS 1.3 only in production
- **At Rest**: Database encryption (PostgreSQL)
- **Passwords**: bcrypt hashing (never reversible)
- **Tokens**: Stored hashed in database

### Sensitive Data Handling

- **PII Redaction**: Passwords, tokens never logged
- **Minimal Collection**: Only collect necessary data
- **Data Anonymization**: Analytics use anonymized data
- **Right to Deletion**: GDPR compliant data deletion

### GDPR Compliance

- **Consent**: Explicit consent for data collection
- **Access**: Users can export their data
- **Deletion**: Users can request data deletion
- **Portability**: Data export in JSON format
- **Retention**: Automatic cleanup of old data

## AI Content Moderation

### OpenAI Moderation API

All user-generated content passes through OpenAI's moderation:

```typescript
Categories checked:
- sexual
- hate
- harassment
- self-harm
- sexual/minors
- hate/threatening
- violence/graphic
- self-harm/intent
- self-harm/instructions
- harassment/threatening
- violence
```

### Strict Mode

When `MODERATION_STRICT_MODE=true`:
- Zero tolerance for ANY flagged content
- Additional checks for child safety
- Manual review queue for borderline content

### Multi-Layer Protection

1. **Input Validation**: Before AI generation
2. **AI Generation**: Safe parameters and prompts
3. **Output Moderation**: After AI generation
4. **Manual Review**: Admin moderation queue
5. **User Reports**: Community flagging system

## Network Security

### Firewall Configuration

```bash
# Allow only necessary ports
22  (SSH - key-only)
80  (HTTP - redirects to HTTPS)
443 (HTTPS)
5432 (PostgreSQL - internal only)
6379 (Redis - internal only)
```

### DDoS Protection

- **Cloudflare**: Free DDoS protection
- **Rate Limiting**: Prevents application-level attacks
- **Connection Limits**: Nginx connection limiting
- **Geo-blocking**: Optional country restrictions

### SSL/TLS Configuration

```nginx
ssl_protocols TLSv1.3;
ssl_ciphers 'HIGH:!aNULL:!MD5';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
```

### CORS Policy

```typescript
Allowed Origins: CORS_ORIGIN environment variable
Credentials: true
Methods: GET, POST, PUT, DELETE, OPTIONS
Headers: Content-Type, Authorization
```

## Incident Response

### Security Event Detection

Automatic alerts for:
- Multiple failed login attempts (5+ in 15 min)
- SQL injection attempts
- XSS attempts
- Rate limit violations
- Unusual API patterns
- Unauthorized access attempts

### Response Procedure

1. **Detection**: Automatic monitoring
2. **Alert**: Log to audit system
3. **Block**: Automatic IP blocking
4. **Investigate**: Review audit logs
5. **Respond**: Take corrective action
6. **Document**: Update incident log
7. **Review**: Post-incident analysis

### Contact Information

**Security Issues**: security@storycanvas.com
**Response Time**: < 24 hours for critical issues

### Vulnerability Disclosure

We welcome responsible disclosure:

1. **Email**: security@storycanvas.com
2. **Include**: Detailed description, steps to reproduce
3. **Do Not**: Publicly disclose before fix
4. **Response**: Acknowledgment within 48 hours

## Security Checklist

### Pre-Deployment

- [ ] Environment variables secured
- [ ] HTTPS certificate installed
- [ ] Firewall configured
- [ ] Database secured (no public access)
- [ ] Redis secured (no public access)
- [ ] Strong passwords set
- [ ] JWT secrets generated (32+ characters)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Content moderation active
- [ ] Backup system configured
- [ ] Monitoring enabled
- [ ] Audit logging verified

### Ongoing Maintenance

- [ ] Security updates applied monthly
- [ ] Logs reviewed weekly
- [ ] Backups tested monthly
- [ ] SSL certificate renewed (auto with Let's Encrypt)
- [ ] Dependency audits monthly (`npm audit`)
- [ ] Penetration testing annually
- [ ] Incident response plan reviewed quarterly
- [ ] Team security training quarterly

### Monitoring

- [ ] Failed login attempts
- [ ] Rate limit violations
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] Unusual API patterns
- [ ] Error rates
- [ ] Response times
- [ ] Database performance

## Best Practices for Developers

### Code Review

- Always validate user input
- Never trust client-side data
- Use parameterized queries (Prisma does this)
- Sanitize before output
- Follow principle of least privilege
- Keep dependencies updated
- Use environment variables for secrets
- Never commit sensitive data

### Testing

```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities
npm audit fix
```

### Secure Coding

```typescript
// ❌ Bad
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Good
const user = await prisma.user.findUnique({
  where: { email: sanitizeString(email) }
});
```

## Compliance

### Standards

- **OWASP Top 10**: All vulnerabilities addressed
- **PCI DSS**: Stripe handles payment data
- **GDPR**: Full compliance for EU users
- **COPPA**: Child privacy protections
- **SOC 2**: Infrastructure compliance (cloud provider)

### Certifications

- SSL/TLS Certificate (Let's Encrypt)
- GDPR Compliance Statement
- Privacy Policy
- Terms of Service
- Cookie Policy

## Additional Resources

- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**Last Updated**: November 14, 2025
**Version**: 1.0.0
**Maintained By**: StoryCanvas Security Team
