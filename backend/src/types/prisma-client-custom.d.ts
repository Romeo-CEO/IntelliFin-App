// This file helps TypeScript understand the Prisma client's private fields

// Extend the global namespace to include Prisma types
declare global {
  // This is a workaround for the Prisma client's private fields issue
  // It tells TypeScript to treat the Prisma client as having the correct type
  namespace PrismaClient {
    class PrismaClient {
      $connect(): Promise<void>;
      $disconnect(): Promise<void>;
      $executeRaw<T = any>(query: TemplateStringsArray | string, ...values: any[]): Promise<T>;
      $executeRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T>;
      $queryRaw<T = any>(query: TemplateStringsArray | string, ...values: any[]): Promise<T>;
      $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T>;
      $transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T>;
      $transaction<T>(queries: any[]): Promise<T[]>;
    }
  }
}

// Extend the Prisma client module
declare module '@prisma/client' {
  import { PrismaClient as PrismaClientType } from '@prisma/client';
  
  // Export the Prisma client type
  const PrismaClient: {
    new (options?: any): PrismaClientType;
  };
  
  export { PrismaClient };
  export * from '@prisma/client';
}

// Extend the Prisma client runtime module
declare module '@prisma/client/runtime' {
  export * from '@prisma/client/runtime';
}

// Extend the Prisma client runtime library module
declare module '@prisma/client/runtime/library' {
  export * from '@prisma/client/runtime/library';
}
