# StoryCanvas Deployment Guide

Complete guide for deploying StoryCanvas to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Deploy (Docker)](#quick-deploy-docker)
3. [Manual Deployment](#manual-deployment)
4. [Cloud Platforms](#cloud-platforms)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [SSL Configuration](#ssl-configuration)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required

- **Server**: Ubuntu 22.04 LTS (or similar)
- **RAM**: Minimum 4GB (8GB+ recommended for production)
- **CPU**: 2+ cores
- **Storage**: 20GB+ SSD
- **Domain**: Registered domain name
- **OpenAI API**: Account with API key
- **Stripe Account**: For payment processing

### Software

- Docker 24.0+
- Docker Compose 2.20+
- Git
- Node.js 20+ (for manual deployment)
- PostgreSQL 15+ (for manual deployment)
- Redis 7+ (for manual deployment)

## Quick Deploy (Docker)

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd fdg
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.production.example .env

# Edit with your values
nano .env
```

Required values:
- `OPENAI_API_KEY`: Your OpenAI API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `JWT_SECRET`: Random 32+ character string
- `JWT_REFRESH_SECRET`: Different random 32+ character string
- `POSTGRES_PASSWORD`: Strong database password
- `API_URL`: Your API domain (e.g., https://api.yourdomain.com)
- `FRONTEND_URL`: Your frontend domain (e.g., https://yourdomain.com)

### 3. Deploy

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# (Optional) Seed database
docker-compose exec backend npm run db:seed
```

### 5. Verify Deployment

- Frontend: http://your-server-ip:3000
- Backend: http://your-server-ip:5000/health
- API Docs: http://your-server-ip:5000/api-docs

### 6. Configure Domain & SSL

See [SSL Configuration](#ssl-configuration) below.

## Manual Deployment

### Backend

```bash
cd backend

# Install dependencies
npm ci --only=production

# Setup environment
cp .env.example .env
nano .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start dist/index.js --name storycanvas-backend
pm2 save
pm2 startup
```

### Frontend

```bash
cd frontend

# Install dependencies
npm ci --only=production

# Setup environment
cp .env.example .env
nano .env

# Build
npm run build

# Start with PM2
pm2 start npm --name storycanvas-frontend -- start
pm2 save
```

### Database

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE storycanvas;
CREATE USER storycanvas WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE storycanvas TO storycanvas;
\q

# Install Redis
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Copy configuration
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

## Cloud Platforms

### DigitalOcean

1. Create Droplet (Ubuntu 22.04, 4GB RAM)
2. Follow Quick Deploy steps above
3. Configure domain in DNS settings
4. Setup Let's Encrypt SSL (see below)

### AWS EC2

1. Launch t3.medium instance (Ubuntu 22.04)
2. Configure Security Groups (ports 80, 443, 22)
3. Allocate Elastic IP
4. Follow Quick Deploy steps
5. Use AWS Certificate Manager for SSL

### Google Cloud Platform

1. Create Compute Engine instance (e2-medium)
2. Configure Firewall rules
3. Reserve static IP
4. Follow Quick Deploy steps
5. Use Google-managed SSL certificates

### Railway / Render / Vercel

These platforms support Docker deployments. Use `docker-compose.yml` as reference.

**Note**: For Vercel, deploy frontend separately as a Next.js app.

## Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=production
PORT=5000
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/storycanvas?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-32-chars-minimum
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-32-chars-minimum
JWT_REFRESH_EXPIRES_IN=30d

# OpenAI
OPENAI_API_KEY=sk-your-key
OPENAI_ORG_ID=org-your-org-id
AI_MODEL_TEXT=gpt-4-turbo-preview
AI_MODEL_IMAGE=dall-e-3

# Stripe
STRIPE_SECRET_KEY=sk_live_your-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://yourdomain.com
ENABLE_CONTENT_MODERATION=true
MODERATION_STRICT_MODE=true

# Limits
FREE_TIER_BOOKS_PER_MONTH=3
```

### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

## Database Setup

### Initial Migration

```bash
cd backend
npx prisma migrate deploy
```

### Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres storycanvas > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres storycanvas < backup.sql
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * docker-compose exec postgres pg_dump -U postgres storycanvas > /backups/storycanvas-$(date +\%Y\%m\%d).sql
```

## SSL Configuration

### Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (should be automatic)
sudo systemctl status certbot.timer
```

### Update Nginx for HTTPS

Uncomment the HTTPS server block in `nginx/nginx.conf` and update:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# Frontend health
curl http://localhost:3000

# Database connection
docker-compose exec postgres pg_isready
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Backend logs only
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run migrations if needed
docker-compose exec backend npx prisma migrate deploy
```

### Monitoring Tools (Optional)

- **Prometheus + Grafana**: Metrics and dashboards
- **Sentry**: Error tracking
- **Datadog**: APM and logging
- **UptimeRobot**: Uptime monitoring

## Scaling

### For 20,000+ Users

#### 1. Horizontal Scaling

```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3

frontend:
  deploy:
    replicas: 2
```

#### 2. Load Balancer

Use Nginx or cloud load balancer:

```nginx
upstream backend {
    least_conn;
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}
```

#### 3. Database Optimization

- **PostgreSQL**: Setup read replicas
- **Redis**: Use Redis Cluster
- **Connection Pooling**: Configure PgBouncer

#### 4. CDN

Use Cloudflare or AWS CloudFront for:
- Static assets
- Image caching
- DDoS protection

#### 5. Caching Strategy

```javascript
// Cache API responses
const ttl = {
  publicBooks: 3600,    // 1 hour
  userProfile: 1800,    // 30 minutes
  bookContent: 86400,   // 24 hours
}
```

#### 6. Background Jobs

Use Bull/BullMQ for:
- Email sending
- Image processing
- Book generation queue

## Troubleshooting

### Database Connection Errors

```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U postgres -d storycanvas

# Check DATABASE_URL format
echo $DATABASE_URL
```

### Backend Won't Start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Missing environment variables
# 2. Database not ready
# 3. Port already in use

# Rebuild
docker-compose up -d --build backend
```

### High Memory Usage

```bash
# Check memory
docker stats

# Increase limits in docker-compose.yml
backend:
  deploy:
    resources:
      limits:
        memory: 2G
```

### Slow AI Generation

- Check OpenAI API quota
- Implement request queuing
- Add loading states in UI
- Use Redis caching for similar prompts

### Payment Issues

- Verify Stripe webhook endpoint
- Check webhook signing secret
- Test with Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:5000/api/subscriptions/webhook
  ```

## Security Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] Environment variables secured
- [ ] Database password strong and unique
- [ ] JWT secrets are random and long
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Content moderation active
- [ ] Regular backups automated
- [ ] Security headers configured
- [ ] Dependency updates scheduled
- [ ] Firewall configured (UFW/iptables)
- [ ] SSH key-only authentication
- [ ] Regular security audits

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review this guide
3. Check GitHub Issues
4. Contact support@storycanvas.com

---

**Production Ready**: This deployment guide will get you from zero to production in under 30 minutes with Docker, or 1-2 hours for manual setup.
