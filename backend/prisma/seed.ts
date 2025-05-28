import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Company Ltd',
      slug: 'demo',
      schemaName: 'tenant_demo',
      businessType: 'Limited Company',
      zraTin: '1234567890',
      address: '123 Independence Avenue',
      city: 'Lusaka',
      country: 'Zambia',
      phone: '+260971234567',
      email: 'demo@intellifin.com',
      industry: 'Technology',
      status: 'ACTIVE',
      subscriptionPlan: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  console.log(`✅ Created demo tenant: ${demoTenant.name}`);

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.intellifin.com' },
    update: {},
    create: {
      email: 'admin@demo.intellifin.com',
      firstName: 'John',
      lastName: 'Mwanza',
      password: hashedPassword,
      phone: '+260971234567',
      status: 'ACTIVE',
      role: 'TENANT_ADMIN',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@demo.intellifin.com' },
    update: {},
    create: {
      email: 'manager@demo.intellifin.com',
      firstName: 'Mary',
      lastName: 'Banda',
      password: hashedPassword,
      phone: '+260971234568',
      status: 'ACTIVE',
      role: 'MANAGER',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  const accountantUser = await prisma.user.upsert({
    where: { email: 'accountant@demo.intellifin.com' },
    update: {},
    create: {
      email: 'accountant@demo.intellifin.com',
      firstName: 'Peter',
      lastName: 'Phiri',
      password: hashedPassword,
      phone: '+260971234569',
      status: 'ACTIVE',
      role: 'USER',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  console.log(`✅ Created demo users: ${adminUser.email}, ${managerUser.email}, ${accountantUser.email}`);

  // Create subscription record
  await prisma.tenantSubscription.upsert({
    where: { id: 'demo-subscription' },
    update: {},
    create: {
      id: 'demo-subscription',
      tenantId: demoTenant.id,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      billingCycle: 'yearly',
      amount: 1200.00,
      currency: 'ZMW',
      features: {
        maxUsers: 10,
        maxInvoices: 1000,
        maxExpenses: 1000,
        mobileMoneyIntegration: true,
        zraIntegration: true,
        advancedReporting: true,
        apiAccess: true,
      },
      limits: {
        storageGB: 10,
        apiCallsPerMonth: 10000,
      },
    },
  });

  console.log('✅ Created subscription record');

  // Create audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        tenantId: demoTenant.id,
        action: 'CREATE',
        resource: 'TENANT',
        resourceId: demoTenant.id,
        newValues: {
          name: demoTenant.name,
          slug: demoTenant.slug,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
      {
        userId: adminUser.id,
        tenantId: demoTenant.id,
        action: 'CREATE',
        resource: 'USER',
        resourceId: adminUser.id,
        newValues: {
          email: adminUser.email,
          role: adminUser.role,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    ],
  });

  console.log('✅ Created audit log entries');

  // Note: Tenant-specific data would be seeded separately after tenant schema creation
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Demo credentials:');
  console.log('Admin: admin@demo.intellifin.com / password123');
  console.log('Manager: manager@demo.intellifin.com / password123');
  console.log('Accountant: accountant@demo.intellifin.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
