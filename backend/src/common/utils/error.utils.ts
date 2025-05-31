import { Logger, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  ValidationErrorDetail
} from '../interfaces/error.interface';

/**
 * Extended Request interface that includes the id property
 */
interface ExtendedRequest extends Request {
  id?: string;
}

/**
 * Interface for error handling options
 */
interface ErrorHandlingOptions {
  /** Logger instance for logging errors */
  logger?: Logger;
  /** Additional context information for the error */
  context?: Record<string, unknown>;
  /** Whether to include the error stack in the response */
  includeStack?: boolean;
  /** Request object for adding request-specific information to the error */
  request?: ExtendedRequest;
}

/**
 * Default error handling options
 */
const DEFAULT_ERROR_OPTIONS: ErrorHandlingOptions = {
  includeStack: process.env.NODE_ENV !== 'production',
  context: {}
};

/**
 * Creates a new application error with standardized properties
 * @param code - Machine-readable error code in UPPER_SNAKE_CASE
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code
 * @param details - Additional error details
 * @param options - Error handling options
 * @returns A standardized AppError object
 * 
 * @example
 * ```typescript
 * throw createError(
 *   'INVALID_INPUT',
 *   'Invalid input provided',
 *   400,
 *   { field: 'email', reason: 'Invalid format' },
 *   { request: req }
 * );
 * ```
 */
export function createError(
  code: string,
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: Record<string, unknown>,
  options: ErrorHandlingOptions = {}
): AppError {
  const { request, ...restOptions } = { ...DEFAULT_ERROR_OPTIONS, ...options };
  const error = new Error(message) as AppError;
  
  error.name = code;
  error.code = code;
  error.statusCode = statusCode;
  error.timestamp = new Date().toISOString();
  
  if (details) {
    error.details = { ...details };
  }
  
  if (restOptions.context) {
    error.details = {
      ...(error.details || {}),
      ...restOptions.context
    };
  }
  
  if (request) {
    error.path = request.path;
    error.method = request.method;
    
    if (!error.details) {
      error.details = {};
    }
    
    error.details.requestId = request.id;
    error.details.ip = request.ip;
  }
  
  // In non-production environments, include the stack trace
  if (restOptions.includeStack && error.stack) {
    error.details = {
      ...(error.details || {}),
      stack: error.stack.split('\n').map(line => line.trim())
    };
  }
  
  return error;
}

/**
 * Creates a validation error with detailed field validation information
 * @param message - Human-readable error message
 * @param errors - Array of validation error details
 * @param options - Error handling options
 * @returns A ValidationError object with validation details
 * 
 * @example
 * ```typescript
 * throw createValidationError('Validation failed', [
 *   { field: 'email', message: 'Invalid email format', value: 'invalid-email' },
 *   { field: 'password', message: 'Password too short', constraints: { minLength: 8 } }
 * ], { request: req });
 * ```
 */
export function createValidationError(
  message: string,
  errors: ValidationErrorDetail[],
  options: ErrorHandlingOptions = {}
): ValidationError {
  const { request, ...restOptions } = { ...DEFAULT_ERROR_OPTIONS, ...options };
  const error = new Error(message) as ValidationError;
  
  error.name = 'ValidationError';
  error.code = 'VALIDATION_ERROR';
  error.statusCode = HttpStatus.BAD_REQUEST;
  error.timestamp = new Date().toISOString();
  error.errors = errors.map(e => ({
    field: e.field,
    message: e.message,
    value: e.value,
    constraints: e.constraints || {}
  }));
  
  if (request) {
    error.path = request.path;
    error.method = request.method;
    
    error.details = {
      requestId: request.id,
      ip: request.ip,
      validationErrors: error.errors
    };
  } else {
    error.details = { validationErrors: error.errors };
  }
  
  // In non-production environments, include the stack trace
  if (restOptions.includeStack && error.stack) {
    error.details.stack = error.stack.split('\n').map(line => line.trim());
  }
  
  return error;
}

/**
 * Creates a not found error
 */
export function createNotFoundError(
  resourceType: string,
  resourceId: string | number,
  message?: string,
  cause?: unknown
): NotFoundError {
  const error = new Error(
    message || `${resourceType} with ID ${resourceId} not found`
  ) as NotFoundError;
  
  error.code = 'NOT_FOUND';
  error.statusCode = 404;
  error.resourceType = resourceType;
  error.resourceId = resourceId;
  
  if (cause) {
    error.cause = cause;
  }
  
  return error;
}

/**
 * Creates a conflict error
 */
export function createConflictError(
  resourceType: string,
  field: string,
  value: unknown,
  message?: string,
  cause?: unknown
): ConflictError {
  const error = new Error(
    message || `${resourceType} with ${field} '${value}' already exists`
  ) as ConflictError;
  
  error.code = 'CONFLICT';
  error.statusCode = 409;
  error.resourceType = resourceType;
  error.field = field;
  error.value = value;
  
  if (cause) {
    error.cause = cause;
  }
  
  return error;
}

/**
 * Handles errors consistently across the application
 */
export function handleError<T>(
  logger: Logger,
  operation: string,
  error: unknown,
  context: Record<string, unknown> = {}
): T | never {
  const errorContext = context || {};
  
  // Log the error with context
  if (error instanceof Error) {
    logger.error(
      `Failed to ${operation}: ${error.message}`,
      error.stack || '',
      { ...errorContext }
    );
  } else {
    logger.error(`Failed to ${operation}: ${String(error)}`, '', errorContext);
  }
  
  // If it's already an AppError, just rethrow it
  if (isAppError(error)) {
    throw error;
  }
  
  // For Prisma errors, convert to appropriate application errors
  if (isPrismaError(error)) {
    const prismaError = error as { code?: string; meta?: unknown; message: string };
    throw handlePrismaError(operation, prismaError, errorContext);
  }
  
  // For other errors, wrap them in a generic error
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorDetails = {
    ...errorContext,
    originalError: errorMessage,
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
  };

  const genericError = createError(
    'INTERNAL_SERVER_ERROR',
    `An unexpected error occurred while trying to ${operation}`,
    HttpStatus.INTERNAL_SERVER_ERROR,
    errorDetails,
    { context: { operation } }
  );
  
  throw genericError;
}

/**
 * Type guard for AppError
 */
function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  );
}

/**
 * Type guard for Prisma errors
 */
function isPrismaError(error: unknown): error is { code?: string; meta?: unknown; message: string } {
  if (!error || typeof error !== 'object') return false;
  
  // Check for Prisma error codes
  const prismaError = error as { code?: string; meta?: unknown };
  return (
    'code' in prismaError &&
    typeof prismaError.code === 'string' &&
    prismaError.code.startsWith('P')
  );
}

/**
 * Handles Prisma-specific errors
 */
function handlePrismaError(
  operation: string,
  error: { code?: string; meta?: unknown; message: string },
  context: Record<string, unknown> = {}
): never {
  const { code, meta, message } = error;
  
  switch (code) {
    case 'P2002': {
      // Unique constraint violation
      const metaInfo = meta as { target?: string[] } | undefined;
      const field = metaInfo?.target?.[0] || 'unknown';
      const value = context[field] || 'unknown';
      
      const conflictError = createConflictError(
        'Resource',
        field,
        value,
        `A resource with this ${field} already exists`,
        error
      );
      throw conflictError;
    }
    
    case 'P2025':
      // Record not found
      const resourceId = 'id' in context && (typeof context.id === 'string' || typeof context.id === 'number')
        ? context.id
        : 'unknown';
      
      const notFoundError = createNotFoundError(
        'Resource',
        resourceId,
        message,
        error
      );
      throw notFoundError;
      
    case 'P2003':
      // Foreign key constraint failed
      const dbError = createError(
        'BAD_REQUEST',
        'Invalid reference: related record not found',
        HttpStatus.BAD_REQUEST,
        { ...context, prismaCode: code },
        { context: { operation, prismaError: error } }
      );
      throw dbError;
      
    default:
      // For other Prisma errors, return a generic database error
      const genericError = createError(
        'DATABASE_ERROR',
        `Database error occurred while trying to ${operation}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
        { prismaCode: code, ...context },
        { context: { operation, prismaError: error } }
      );
      throw genericError;
  }
}
