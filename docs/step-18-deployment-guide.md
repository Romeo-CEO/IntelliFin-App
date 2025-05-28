# IntelliFin Step 18 - Dashboard Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the enhanced IntelliFin Step 18 Dashboard and User Interface system.

## Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Redis**: v6.0 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Minimum 20GB available space

### Dependencies
- All Step 19 Analytics services must be deployed and functional
- Database migrations from Steps 2-17 must be completed
- Redis server must be accessible for caching

## 1. Environment Configuration

### 1.1 Backend Environment Variables

Create or update `.env` file in the backend directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://intellifin-core:Chizzy@1!@localhost:5432/intellifin-core"

# Redis Configuration (Required for Dashboard Caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Dashboard Performance Settings
DASHBOARD_CACHE_TTL=300
WIDGET_REFRESH_INTERVAL=300
LOW_BANDWIDTH_MODE=false
PERFORMANCE_MONITORING=true

# Zambian Market Configuration
DEFAULT_CURRENCY=ZMW
ZRA_INTEGRATION_ENABLED=true
MOBILE_MONEY_PROVIDERS=airtel,mtn,zamtel
TAX_CALENDAR_ENABLED=true

# Analytics Integration
ANALYTICS_SERVICE_URL=http://localhost:3000/analytics
FORECASTING_ACCURACY_TARGET=0.85
ANOMALY_DETECTION_SENSITIVITY=MEDIUM

# Rate Limiting
DASHBOARD_RATE_LIMIT_WINDOW=60000
DASHBOARD_RATE_LIMIT_MAX=20
KPI_RATE_LIMIT_MAX=30
WIDGET_RATE_LIMIT_MAX=50

# Security
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3001
```

### 1.2 Frontend Environment Variables

Create or update `.env.local` file in the frontend directory:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3000/dashboard-data

# Performance Settings
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_LOW_BANDWIDTH_MODE=false
NEXT_PUBLIC_CACHE_ENABLED=true

# Zambian Market Settings
NEXT_PUBLIC_DEFAULT_CURRENCY=ZMW
NEXT_PUBLIC_MOBILE_MONEY_ENABLED=true
NEXT_PUBLIC_ZRA_COMPLIANCE_ENABLED=true

# Chart and Visualization Settings
NEXT_PUBLIC_CHART_ANIMATION_ENABLED=true
NEXT_PUBLIC_CHART_RESPONSIVE=true
NEXT_PUBLIC_MOBILE_CHART_HEIGHT=200
```

## 2. Database Setup

### 2.1 Run Dashboard Migrations

```bash
cd backend
npm run migration:run
```

### 2.2 Verify Dashboard Tables

Ensure the following tables exist:
- `dashboard_configurations`
- `dashboard_widgets`
- `dashboard_widget_positions`
- `dashboard_permissions`

### 2.3 Seed Default Dashboard Data (Optional)

```bash
npm run seed:dashboard
```

## 3. Redis Setup

### 3.1 Install Redis (if not already installed)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
```

**Windows:**
```bash
# Download and install Redis from https://redis.io/download
# Or use Docker:
docker run -d -p 6379:6379 --name redis redis:latest
```

### 3.2 Configure Redis for Dashboard Caching

Edit Redis configuration (`/etc/redis/redis.conf`):

```bash
# Memory optimization for dashboard caching
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence settings
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_redis_password
```

### 3.3 Start Redis Service

```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3.4 Verify Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

## 4. Backend Deployment

### 4.1 Install Dependencies

```bash
cd backend
npm install
```

### 4.2 Build the Application

```bash
npm run build
```

### 4.3 Start the Backend Service

**Development:**
```bash
npm run start:dev
```

**Production:**
```bash
npm run start:prod
```

### 4.4 Verify Backend Health

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 4.5 Test Dashboard Endpoints

```bash
# Test KPI endpoint (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/dashboard-data/kpis

# Test dashboard overview
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/dashboard-data/overview
```

## 5. Frontend Deployment

### 5.1 Install Dependencies

```bash
cd frontend
npm install
```

### 5.2 Build the Application

```bash
npm run build
```

### 5.3 Start the Frontend Service

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run start
```

### 5.4 Verify Frontend Access

Navigate to `http://localhost:3001` and verify:
- ✅ Dashboard loads without errors
- ✅ Widgets display data correctly
- ✅ Mobile responsiveness works
- ✅ Performance is acceptable

## 6. Performance Optimization

### 6.1 Redis Optimization

**Memory Optimization:**
```bash
# Monitor Redis memory usage
redis-cli info memory

# Optimize key expiration
redis-cli config set maxmemory-policy allkeys-lru
```

**Connection Pooling:**
```typescript
// Backend Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
};
```

### 6.2 Database Optimization

**Index Creation:**
```sql
-- Optimize dashboard queries
CREATE INDEX CONCURRENTLY idx_dashboard_widgets_dashboard_id 
ON dashboard_widgets(dashboard_id);

CREATE INDEX CONCURRENTLY idx_dashboard_configurations_org_id 
ON dashboard_configurations(organization_id);

-- Optimize analytics queries
CREATE INDEX CONCURRENTLY idx_invoices_org_created 
ON invoices(organization_id, created_at);

CREATE INDEX CONCURRENTLY idx_payments_org_created 
ON payments(organization_id, created_at);
```

**Query Optimization:**
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM dashboard_widgets 
WHERE dashboard_id = 'your-dashboard-id';
```

### 6.3 Frontend Optimization

**Bundle Optimization:**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
};
```

## 7. Monitoring and Logging

### 7.1 Backend Monitoring

**Health Check Endpoint:**
```typescript
// Add to app.controller.ts
@Get('health/dashboard')
async getDashboardHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: await this.cacheService.isAvailable(),
      analytics: await this.analyticsService.isHealthy(),
      database: await this.databaseService.isHealthy(),
    },
  };
}
```

**Performance Monitoring:**
```typescript
// Add performance logging
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          console.warn(`Slow request: ${context.getHandler().name} took ${duration}ms`);
        }
      }),
    );
  }
}
```

### 7.2 Frontend Monitoring

**Performance Tracking:**
```typescript
// Add to dashboard components
useEffect(() => {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 3000) {
        console.warn(`Slow dashboard load: ${entry.duration}ms`);
      }
    });
  });
  observer.observe({ entryTypes: ['navigation', 'measure'] });
}, []);
```

### 7.3 Log Configuration

**Backend Logging:**
```typescript
// logger.config.ts
export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/dashboard-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/dashboard-combined.log' }),
  ],
};
```

## 8. Security Configuration

### 8.1 API Security

**Rate Limiting:**
```typescript
// Already configured in dashboard controllers
@Throttle({ default: { limit: 20, ttl: 60000 } })
```

**CORS Configuration:**
```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
```

### 8.2 Data Security

**Multi-tenant Isolation:**
```typescript
// Ensure all dashboard queries include organization filter
const dashboardData = await this.repository.find({
  where: { organizationId: user.organizationId },
});
```

## 9. Troubleshooting

### 9.1 Common Issues

**Redis Connection Issues:**
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check logs
sudo journalctl -u redis-server
```

**Dashboard Loading Issues:**
```bash
# Check backend logs
tail -f logs/dashboard-combined.log

# Verify database connection
npm run migration:status

# Test API endpoints
curl -v http://localhost:3000/dashboard-data/health
```

**Performance Issues:**
```bash
# Monitor Redis memory
redis-cli info memory

# Check database performance
EXPLAIN ANALYZE SELECT * FROM dashboard_widgets;

# Monitor Node.js memory
node --inspect app.js
```

### 9.2 Performance Tuning

**If dashboard loads slowly:**
1. Check Redis cache hit ratio
2. Optimize database queries
3. Enable low-bandwidth mode
4. Reduce widget refresh intervals

**If memory usage is high:**
1. Adjust Redis maxmemory settings
2. Optimize cache TTL values
3. Review database connection pooling
4. Monitor for memory leaks

## 10. Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Redis server running and accessible
- [ ] Database migrations completed
- [ ] Dependencies installed
- [ ] Build process successful

### Post-deployment
- [ ] Health checks passing
- [ ] Dashboard endpoints responding
- [ ] Frontend loading correctly
- [ ] Performance within targets (< 3s load time)
- [ ] Cache functioning properly
- [ ] Monitoring and logging active
- [ ] Security measures in place

### Verification
- [ ] Create test dashboard
- [ ] Add test widgets
- [ ] Verify data accuracy
- [ ] Test mobile responsiveness
- [ ] Validate Zambian features (ZRA, mobile money)
- [ ] Confirm multi-tenant isolation

## 11. Maintenance

### Regular Tasks
- Monitor Redis memory usage
- Review dashboard performance metrics
- Update cache TTL values as needed
- Optimize database queries
- Review and rotate logs

### Updates
- Keep dependencies updated
- Monitor for security patches
- Review performance optimizations
- Update documentation as needed

This deployment guide ensures a successful and optimized deployment of the IntelliFin Step 18 enhanced dashboard system.
