# 🚀 StoryCanvas - Quick Start Guide

Get StoryCanvas running in 5 minutes!

## Prerequisites

You need:
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **Stripe Account** ([Sign up](https://dashboard.stripe.com/register)) - Optional for payments
- **Docker & Docker Compose** installed

## Option 1: Docker (Recommended) ⚡

### 1. Setup Environment

```bash
# Copy environment template
cp .env.production.example .env

# Edit the file and add your keys
nano .env
```

**Required variables:**
```bash
OPENAI_API_KEY=sk-your-openai-key-here
JWT_SECRET=generate-random-32-char-string
JWT_REFRESH_SECRET=generate-different-random-32-char-string
POSTGRES_PASSWORD=your-secure-password

# Optional (for payments)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

### 2. Start Services

```bash
# Start everything
docker-compose up -d

# Wait for services to be ready (~30 seconds)
docker-compose logs -f backend

# Initialize database
docker-compose exec backend npx prisma migrate deploy
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/health
- **API Docs**: http://localhost:5000/api-docs

### 4. Create First Book

1. Visit http://localhost:3000
2. Click "Get Started" to register
3. Create your first magical book!

## Option 2: Local Development 💻

### Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Add your OpenAI key and other settings

# Setup database (you need PostgreSQL and Redis running)
npx prisma migrate dev

# Start development server
npm run dev
```

Backend runs on http://localhost:5000

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Set NEXT_PUBLIC_API_URL=http://localhost:5000

# Start development server
npm run dev
```

Frontend runs on http://localhost:3000

## Testing the Application

### 1. Health Checks

```bash
# Backend
curl http://localhost:5000/health

# Should return: {"status":"ok",...}
```

### 2. Create Test Account

Visit http://localhost:3000/register and create an account.

### 3. Generate Your First Book

1. Login with your account
2. Click "Create New Book"
3. Enter:
   - Title: "My First Adventure"
   - Description: "A magical journey"
   - Story prompt: "A brave child discovers a magical forest"
   - Choose illustration style
4. Click "Generate Story"
5. Wait for AI to create your book (~30 seconds)
6. View in 3D book reader!

## Environment Variables Explained

### Backend (.env)

```bash
# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-...          # Get from platform.openai.com

# Database (auto-configured in Docker)
DATABASE_URL=postgresql://...   # PostgreSQL connection string
REDIS_URL=redis://...          # Redis connection string

# Security (REQUIRED)
JWT_SECRET=random-32-chars      # Generate with: openssl rand -hex 32
JWT_REFRESH_SECRET=different-random-32-chars

# Stripe (OPTIONAL - for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # If using payments
```

## Troubleshooting

### "Connection refused" errors

**Problem**: Services not ready

**Solution**:
```bash
# Check all services are running
docker-compose ps

# Restart services
docker-compose restart

# Check logs
docker-compose logs -f
```

### "Database not found" error

**Problem**: Database not initialized

**Solution**:
```bash
docker-compose exec backend npx prisma migrate deploy
```

### OpenAI errors

**Problem**: Invalid API key or quota exceeded

**Solution**:
- Verify your API key in `.env`
- Check your OpenAI account has credits
- Visit https://platform.openai.com/account/billing

### Port already in use

**Problem**: Ports 3000, 5000, or 5432 already taken

**Solution**:
```bash
# Change ports in docker-compose.yml
# For example, change "3000:3000" to "3001:3000"
```

## Commands Cheat Sheet

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Access backend shell
docker-compose exec backend sh

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Backup database
docker-compose exec postgres pg_dump -U postgres storycanvas > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres storycanvas < backup.sql
```

## Next Steps

1. **Customize**: Edit styles in `frontend/src/app/globals.css`
2. **Configure**: Update limits in `backend/.env`
3. **Deploy**: See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment
4. **Extend**: Add features in `backend/src` and `frontend/src`

## API Examples

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Create Book

```bash
# First get your token from registration/login
TOKEN="your-jwt-token"

curl -X POST http://localhost:5000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "My Story",
    "description": "An amazing tale",
    "storyPrompt": "A child finds a magical book",
    "illustrationStyle": "CARTOON"
  }'
```

## Features Overview

- ✅ **AI Story Generation**: GPT-4 powered
- ✅ **AI Illustrations**: DALL-E 3 images
- ✅ **3D Book Viewer**: Interactive reading experience
- ✅ **Content Moderation**: Child-safe content
- ✅ **User Accounts**: Parent/child profiles
- ✅ **Subscriptions**: Stripe integration
- ✅ **Responsive Design**: Mobile & desktop
- ✅ **Docker Ready**: Easy deployment
- ✅ **Production Ready**: Scalable to 20K+ users

## Support

- **Documentation**: [README.md](README.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Issues**: GitHub Issues
- **API Docs**: http://localhost:5000/api-docs (when running)

---

**Ready to monetize?** See payment setup in [DEPLOYMENT.md](docs/DEPLOYMENT.md#stripe-configuration)

**Ready for production?** Follow [DEPLOYMENT.md](docs/DEPLOYMENT.md) for cloud deployment.
