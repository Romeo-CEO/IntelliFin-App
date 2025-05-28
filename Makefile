# IntelliFin Development Makefile
# Provides convenient commands for development workflow

.PHONY: help install dev build test lint format clean docker-up docker-down docker-logs setup-env

# Default target
help:
	@echo "IntelliFin Development Commands"
	@echo "==============================="
	@echo ""
	@echo "Setup Commands:"
	@echo "  install     - Install all dependencies"
	@echo "  setup-env   - Set up environment files"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev         - Start development servers"
	@echo "  build       - Build all applications"
	@echo "  test        - Run all tests"
	@echo "  lint        - Run linting"
	@echo "  format      - Format code"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-up   - Start Docker services"
	@echo "  docker-down - Stop Docker services"
	@echo "  docker-logs - View Docker logs"
	@echo ""
	@echo "Utility Commands:"
	@echo "  clean       - Clean build artifacts"
	@echo "  help        - Show this help message"

# Setup commands
install:
	@echo "📦 Installing dependencies..."
	cd frontend && npm install
	cd backend && npm install
	@echo "✅ Dependencies installed successfully"

setup-env:
	@echo "🔧 Setting up environment files..."
	cp backend/.env.example backend/.env
	cp frontend/.env.local.example frontend/.env.local
	@echo "✅ Environment files created"
	@echo "⚠️  Please update the environment files with your configuration"

# Development commands
dev:
	@echo "🚀 Starting development servers..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"
	@echo "API Docs: http://localhost:3001/api/docs"
	@make docker-up
	@echo "Starting frontend and backend..."
	@(cd frontend && npm run dev) & (cd backend && npm run start:dev)

build:
	@echo "🏗️  Building applications..."
	cd frontend && npm run build
	cd backend && npm run build
	@echo "✅ Build completed successfully"

test:
	@echo "🧪 Running tests..."
	cd frontend && npm run test
	cd backend && npm run test
	@echo "✅ Tests completed"

lint:
	@echo "🔍 Running linting..."
	cd frontend && npm run lint
	cd backend && npm run lint
	@echo "✅ Linting completed"

format:
	@echo "💅 Formatting code..."
	cd frontend && npm run lint:fix
	cd backend && npm run format
	@echo "✅ Code formatting completed"

# Docker commands
docker-up:
	@echo "🐳 Starting Docker services..."
	docker-compose up -d postgres redis mailhog minio
	@echo "✅ Docker services started"
	@echo "📊 Services available:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"
	@echo "  - MailHog: http://localhost:8025"
	@echo "  - MinIO: http://localhost:9001"

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose down
	@echo "✅ Docker services stopped"

docker-logs:
	@echo "📋 Viewing Docker logs..."
	docker-compose logs -f

# Database commands
db-init:
	@echo "🚀 Initializing IntelliFin database..."
	cd backend && ts-node scripts/init-database.ts
	@echo "✅ Database initialization completed"

db-migrate:
	@echo "🗄️  Running database migrations..."
	cd backend && npx prisma migrate dev
	@echo "✅ Database migrations completed"

db-generate:
	@echo "🔧 Generating Prisma client..."
	cd backend && npx prisma generate
	@echo "✅ Prisma client generated"

db-seed:
	@echo "🌱 Seeding database..."
	cd backend && npx prisma db seed
	@echo "✅ Database seeded"

db-reset:
	@echo "🔄 Resetting database..."
	cd backend && npx prisma migrate reset --force
	@echo "✅ Database reset completed"

db-studio:
	@echo "🎨 Opening Prisma Studio..."
	cd backend && npx prisma studio

db-stats:
	@echo "📊 Getting database statistics..."
	cd backend && ts-node -e "import('./src/database/migration.service').then(m => new m.MigrationService().getDatabaseStats().then(console.log))"

# Utility commands
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf frontend/.next
	rm -rf frontend/out
	rm -rf backend/dist
	rm -rf node_modules
	rm -rf frontend/node_modules
	rm -rf backend/node_modules
	@echo "✅ Clean completed"

# Production commands
deploy-staging:
	@echo "🚀 Deploying to staging..."
	# Add staging deployment commands here
	@echo "✅ Deployed to staging"

deploy-production:
	@echo "🚀 Deploying to production..."
	# Add production deployment commands here
	@echo "✅ Deployed to production"

# Health check
health:
	@echo "🏥 Checking application health..."
	curl -f http://localhost:3001/api/health || echo "❌ Backend health check failed"
	curl -f http://localhost:3000 || echo "❌ Frontend health check failed"
	@echo "✅ Health check completed"
