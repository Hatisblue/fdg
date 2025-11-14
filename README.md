# 📚 StoryCanvas - AI-Powered Children's Book Creator

> Create magical, animated, 3D children's books with AI - Safe, Beautiful, and Educational

## 🌟 Features

### Core Functionality
- **AI Story Generation**: GPT-4 powered story creation from simple descriptions
- **AI Illustration**: DALL-E 3 generates stunning, child-friendly illustrations
- **3D Book Experience**: Interactive 3D book viewer with page-turning animations
- **Multi-platform**: Responsive design for desktop, tablet, and mobile
- **Content Safety**: Advanced AI moderation for text and images (child-safe)

### User Features
- 👨‍👩‍👧‍👦 Family accounts (parents and children)
- 📖 Create unlimited personalized stories
- 🎨 Multiple illustration styles (watercolor, cartoon, realistic, fantasy)
- 🌍 Multi-language support
- 💾 Save and share your creations
- 📱 Download as PDF or interactive web book
- ⭐ Community gallery (moderated)

### Technical Features
- 🚀 Scalable to 20,000+ concurrent users
- 🔒 Enterprise-grade security
- 💳 Stripe payment integration
- 📊 Admin dashboard with analytics
- 🐳 Docker-ready deployment
- ⚡ Redis caching for performance
- 🔐 JWT authentication
- 🛡️ Rate limiting and DDoS protection

## 🏗️ Architecture

```
┌─────────────────┐
│   Nginx Proxy   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│ Next  │ │ Express │
│ .js   │ │ Backend │
└───┬───┘ └──┬──────┘
    │        │
    │    ┌───▼────────┐
    │    │ PostgreSQL │
    │    │   Redis    │
    │    └───┬────────┘
    │        │
    └────┬───┴─────────┐
         │             │
    ┌────▼──────┐ ┌───▼─────┐
    │ OpenAI    │ │ Stripe  │
    │ APIs      │ │ Payment │
    └───────────┘ └─────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd fdg
```

2. Setup environment variables:
```bash
# Backend
cp backend/.env.example backend/.env
# Frontend
cp frontend/.env.example frontend/.env
```

3. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

4. Run database migrations:
```bash
cd backend
npm run migrate
```

5. Start development servers:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000`

### Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📦 Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **API Docs**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: TailwindCSS + Shadcn/ui
- **3D Graphics**: Three.js + React Three Fiber
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

### AI Services
- **Text Generation**: OpenAI GPT-4
- **Image Generation**: OpenAI DALL-E 3
- **Content Moderation**: OpenAI Moderation API

### DevOps
- **Containerization**: Docker
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions
- **Monitoring**: (Optional) Prometheus + Grafana

## 🔒 Security Features

- ✅ Content moderation for all user-generated content
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection (input sanitization)
- ✅ CSRF protection
- ✅ Rate limiting per user/IP
- ✅ Helmet.js security headers
- ✅ HTTPS enforcement
- ✅ JWT token rotation
- ✅ Password hashing (bcrypt)
- ✅ Input validation on all endpoints
- ✅ Age verification for children's accounts
- ✅ GDPR compliant data handling

## 💰 Monetization

- **Free Tier**: 3 books/month
- **Premium**: $9.99/month - Unlimited books
- **Family Plan**: $14.99/month - Up to 5 children
- **Enterprise**: Custom pricing for schools

## 📚 API Documentation

Once running, visit:
- Backend API Docs: `http://localhost:5000/api-docs`
- Frontend: `http://localhost:3000`

## 📖 Project Structure

```
fdg/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Database models (Prisma)
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   ├── prisma/           # Database schema & migrations
│   └── tests/            # API tests
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities and helpers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── types/        # TypeScript types
│   │   └── styles/       # Global styles
│   └── public/           # Static assets
├── docs/                 # Additional documentation
├── docker-compose.yml    # Docker orchestration
└── nginx/                # Nginx configuration
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 🌍 Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options
- **VPS/Cloud**: DigitalOcean, AWS, Google Cloud
- **Platform**: Railway, Render, Vercel (frontend)
- **Recommended**: Docker Compose on Ubuntu 22.04 LTS

## 📈 Scaling

For 20,000+ users:
- Horizontal scaling with load balancer
- PostgreSQL read replicas
- Redis cluster for distributed caching
- CDN for static assets (Cloudflare)
- Background job queue (Bull/BullMQ)

## 🤝 Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md)

## 📄 License

MIT License - See [LICENSE](LICENSE)

## 🆘 Support

- Documentation: [docs/](docs/)
- Issues: GitHub Issues
- Email: support@storycanvas.com

## 🎯 Roadmap

- [x] Core book creation
- [x] AI integration
- [x] 3D book viewer
- [ ] Mobile apps (iOS/Android)
- [ ] Voice narration
- [ ] Collaborative editing
- [ ] Teacher/classroom features
- [ ] AR book viewing
- [ ] Multi-language UI

---

Built with ❤️ for children and families worldwide
