// Type definitions for Prisma Client
// This file extends the Prisma client with additional type safety and custom types

// Import the generated Prisma Client types
import { Prisma as PrismaNamespace, PrismaClient as PrismaClientGenerated } from '@prisma/client';

// Re-export all Prisma types
export * from '@prisma/client';

// Extend the Prisma namespace with our custom types
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Prisma {
    // Re-export all types from @prisma/client
    export import Prisma = PrismaNamespace.Prisma;
    
    // Re-export model types
    export import Category = PrismaNamespace.Category;
    export import User = PrismaNamespace.User;
    export import Organization = PrismaNamespace.Organization;
    export import Tenant = PrismaNamespace.Tenant;
    export import UserSession = PrismaNamespace.UserSession;
    
    // Re-export enums
    export import CategoryType = PrismaNamespace.CategoryType;
    export import UserRole = PrismaNamespace.UserRole;
    
    // Extend PrismaClient to include all models and custom methods
    export interface PrismaClient extends PrismaClientGenerated {
      // Add any custom methods here if needed
      $transaction<T>(
        fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>,
        options?: { maxWait?: number; timeout?: number; isolationLevel?: any }
      ): Promise<T>;
    }
  }
  
  // Make PrismaClient available globally
  // eslint-disable-next-line no-var
  var Prisma: typeof import('@prisma/client').Prisma;
}

// Global augmentation for the Prisma Client
declare global {
  // This makes the PrismaClient available globally
  // eslint-disable-next-line no-var
  var prisma: PrismaClientGenerated | undefined;
}

declare module '@prisma/client' {
  // This ensures that the PrismaClient class has all the methods we need
  export interface PrismaClient extends PrismaClientGenerated {
    // Add any custom methods or overrides here if needed
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $executeRaw<T = any>(query: TemplateStringsArray | string, ...values: any[]): Promise<T>;
    $executeRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T>;
    $queryRaw<T = any>(query: TemplateStringsArray | string, ...values: any[]): Promise<T>;
    $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T>;
    $transaction<T>(fn: (prisma: any) => Promise<T>, options?: { maxWait?: number; timeout?: number; isolationLevel?: any }): Promise<T>;
    $transaction<R>(fn: (prisma: any) => Promise<R>): Promise<R>;
    $on(eventType: string | symbol, listener: (...args: any[]) => void): this;
  }

  // Re-export all the Prisma types
  export * from '@prisma/client';
}

// This helps TypeScript understand the private fields in Prisma's generated client
declare module '@prisma/client/runtime' {
  export * from '@prisma/client/runtime';
}

declare module '@prisma/client/runtime/library' {
  export * from '@prisma/client/runtime/library';
  
  // Export specific types that might be needed
  export class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    clientVersion: string;
    
    constructor(
      message: string,
      code: string,
      clientVersion: string,
      meta?: Record<string, unknown>
    );
  }
}
