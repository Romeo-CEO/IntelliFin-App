# IntelliFin Database Architecture

This document describes the database architecture and setup for the IntelliFin platform.

## Overview

IntelliFin uses a **multi-tenant architecture** with a **schema-per-tenant** approach using PostgreSQL. This provides strong data isolation while maintaining performance and scalability.

## Architecture Components

### 1. Global Schema (public)
Contains shared data across all tenants:
- `tenants` - Tenant information and configuration
- `users` - User accounts and authentication
- `user_sessions` - Active user sessions
- `tenant_subscriptions` - Subscription and billing information
- `audit_logs` - Cross-tenant audit trail

### 2. Tenant Schemas
Each tenant gets their own PostgreSQL schema containing:
- `organizations` - Business information
- `customers` - Customer management
- `invoices` & `invoice_items` - Invoice management
- `expenses` - Expense tracking
- `transactions` - Mobile money transactions
- `payments` - Payment records
- `categories` - Chart of accounts
- `mobile_money_accounts` - Mobile money integration

## Key Features

### Multi-Tenant Isolation
- **Schema-per-tenant**: Each tenant has a dedicated PostgreSQL schema
- **Data isolation**: Complete separation of tenant data
- **Performance**: Optimized queries within tenant boundaries
- **Scalability**: Easy to scale individual tenants

### Zambian Business Compliance
- **ZRA Integration**: Built-in support for ZRA Smart Invoice
- **Chart of Accounts**: Zambian-specific account categories
- **VAT Handling**: 16% VAT rate with proper calculations
- **Mobile Money**: Native support for Airtel Money, MTN Money, Zamtel Kwacha

### Audit and Security
- **Comprehensive Audit Trail**: All changes tracked with user, timestamp, and IP
- **Soft Deletes**: Data preservation with `deleted_at` timestamps
- **Data Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based permissions

## Database Setup

### Prerequisites
- PostgreSQL 15+
- Node.js 18+
- npm or yarn

### Quick Setup
```bash
# 1. Start PostgreSQL (using Docker)
make docker-up

# 2. Initialize database
make db-init

# 3. Generate Prisma client
make db-generate

# 4. Run migrations
make db-migrate

# 5. Seed demo data
make db-seed
```

### Manual Setup
```bash
# 1. Set up environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials

# 2. Install dependencies
cd backend && npm install

# 3. Initialize database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 4. Start application
npm run start:dev
```

## Schema Management

### Creating a New Tenant
```typescript
import { TenantService } from './modules/tenants/tenant.service';

const tenantService = new TenantService();

const tenant = await tenantService.createTenant({
  name: 'Acme Corporation',
  slug: 'acme-corp',
  businessType: 'Limited Company',
  zraTin: '1234567890',
  email: 'info@acme.com',
  // ... other details
});
```

### Accessing Tenant Data
```typescript
import { TenantDatabaseProvider } from './modules/tenants/providers/tenant-database.provider';

// In a request-scoped service
const tenantClient = this.tenantDatabaseProvider.getTenantClient();

// Query tenant-specific data
const invoices = await tenantClient.invoice.findMany({
  where: { status: 'DRAFT' }
});
```

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name add_new_feature

# Deploy to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## Performance Optimization

### Indexing Strategy
- **Primary Keys**: UUID with btree indexes
- **Foreign Keys**: Automatic indexes on all relationships
- **Query Optimization**: Indexes on frequently queried columns
- **Composite Indexes**: Multi-column indexes for complex queries

### Connection Pooling
- **PgBouncer**: Connection pooling for production
- **Prisma Connection Pool**: Built-in connection management
- **Per-Tenant Limits**: Configurable connection limits

### Monitoring
```bash
# Database statistics
make db-stats

# Prisma Studio (GUI)
make db-studio

# Query performance
EXPLAIN ANALYZE SELECT ...
```

## Backup and Recovery

### Automated Backups
```bash
# Backup specific tenant
pg_dump -n tenant_acme_corp intellifin > backup.sql

# Restore tenant
psql intellifin < backup.sql
```

### Disaster Recovery
1. **Daily Backups**: Automated PostgreSQL backups
2. **Point-in-Time Recovery**: WAL archiving enabled
3. **Cross-Region Replication**: For production environments
4. **Schema Versioning**: All migrations tracked and reversible

## Security Considerations

### Data Protection
- **Encryption at Rest**: PostgreSQL TDE enabled
- **Encryption in Transit**: SSL/TLS connections required
- **Row-Level Security**: Additional tenant isolation
- **Audit Logging**: All data access logged

### Access Control
- **Database Users**: Separate users for different environments
- **Connection Limits**: Per-user connection restrictions
- **IP Whitelisting**: Network-level access control
- **Regular Security Updates**: Automated patching

## Troubleshooting

### Common Issues

#### Connection Errors
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Test connection
psql -h localhost -U intellifin -d intellifin
```

#### Migration Failures
```bash
# Check migration status
npx prisma migrate status

# Reset and retry
npx prisma migrate reset
npx prisma migrate dev
```

#### Performance Issues
```bash
# Analyze slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'tenant_demo';
```

### Monitoring Queries
```sql
-- Active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Database size
SELECT pg_size_pretty(pg_database_size('intellifin'));

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname LIKE 'tenant_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Development Guidelines

### Schema Changes
1. **Always use migrations** for schema changes
2. **Test migrations** on sample data first
3. **Backup before major changes**
4. **Document breaking changes**

### Query Best Practices
1. **Use indexes** for WHERE clauses
2. **Limit result sets** with pagination
3. **Avoid N+1 queries** with proper includes
4. **Use transactions** for multi-table operations

### Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Database tests
npm run test:db
```

## Support

For database-related issues:
1. Check the logs: `docker-compose logs postgres`
2. Review the documentation above
3. Contact the development team
4. Create an issue in the project repository

---

**Note**: This database architecture is designed specifically for Zambian SMEs and includes compliance features for ZRA and local business requirements.
