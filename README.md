# IntelliFin - Financial Management Platform for Zambian SMEs

IntelliFin is a comprehensive, cloud-based financial management and compliance platform designed specifically for Zambian Small and Medium Enterprises (SMEs) and Mobile Money Agents. It integrates core bookkeeping, invoicing, expense management, and seamless mobile money transaction processing with automated ZRA tax compliance.

## 🚀 Features

- **User Authentication & Onboarding**: Secure multi-tenant authentication with business profile setup
- **Airtel Mobile Money Integration**: Automated transaction import and real-time balance monitoring
- **Invoice Management**: Professional invoice creation with ZRA Smart Invoice compliance
- **Expense Management**: Digital expense recording with Zambian Chart of Accounts
- **Financial Dashboard**: Real-time insights and customizable reporting

## 🏗️ Architecture

- **Frontend**: Next.js with TypeScript
- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM (schema-per-tenant)
- **Queue System**: Bull/BullMQ for background processing
- **Caching**: Redis
- **File Storage**: Azure Blob Storage
- **Cloud Platform**: Microsoft Azure

## 🛠️ Development Setup

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd intellifin
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..

   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

4. **Start development environment**
   ```bash
   # Start all services with Docker Compose
   docker-compose up -d

   # Start frontend development server
   cd frontend
   npm run dev

   # Start backend development server (in another terminal)
   cd backend
   npm run start:dev
   ```

### Environment Variables

#### Backend (.env)
```
DATABASE_URL="postgresql://intellifin:password@localhost:5432/intellifin"
JWT_SECRET="your-jwt-secret"
AZURE_KEY_VAULT_URL="your-azure-key-vault-url"
AIRTEL_CLIENT_ID="your-airtel-client-id"
AIRTEL_CLIENT_SECRET="your-airtel-client-secret"
ZRA_API_URL="your-zra-api-url"
REDIS_URL="redis://localhost:6379"
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📁 Project Structure

```
intellifin/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages and layouts
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions
│   │   ├── providers/       # React context providers
│   │   └── types/           # TypeScript type definitions
│   └── public/              # Static assets
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   ├── common/          # Common utilities
│   │   ├── config/          # Configuration modules
│   │   ├── database/        # Database related code
│   │   └── integrations/    # Third-party integrations
│   ├── prisma/              # Database schema and migrations
│   └── test/                # Test files
├── docs/                    # Project documentation
├── docker-compose.yml       # Docker development environment
└── README.md               # This file
```

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm run test

# Run frontend tests
cd frontend
npm run test

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

The application is designed to be deployed on Microsoft Azure with the following services:
- Azure App Service (Frontend & Backend)
- Azure Database for PostgreSQL
- Azure Redis Cache
- Azure Blob Storage
- Azure Key Vault

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed by PoshyTrends Digital Solutions.

## 🤝 Support

For support and questions, please contact:
- Email: support@poshytrends.com
- Website: https://poshytrends.com

---

**Built with ❤️ for Zambian SMEs by PoshyTrends Digital Solutions**
