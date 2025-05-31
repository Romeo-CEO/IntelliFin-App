import { PrismaClient as PrismaClientType } from '@prisma/client';

declare module '@prisma/client' {
  // Re-export all types from the generated client
  export * from '.prisma/client';

  // Extend the PrismaClient type to include all models
  export interface PrismaClient extends PrismaClientType {
    // Add any custom methods or overrides here if needed
  }

  // Export PrismaClient as a type and value
  export const PrismaClient: new (options?: any) => PrismaClientType;
}

// Make Prisma types available globally
declare global {
  // This allows us to use `Prisma` in our code without importing it
  const Prisma: typeof import('@prisma/client');
}
