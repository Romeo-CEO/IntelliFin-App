/**
 * Base interface for all application errors
 * @extends Error - Extends the standard Error type
 */
export interface AppError extends Error {
  /**
   * Machine-readable error code in UPPER_SNAKE_CASE
   * @example 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED'
   */
  code: string;
  
  /**
   * HTTP status code
   * @example 400, 401, 404, 500
   */
  statusCode: number;
  
  /**
   * Additional error details for debugging and client-side handling
   */
  details?: Record<string, unknown>;
  
  /**
   * Original error that caused this error
   * Can be used for debugging and logging
   */
  cause?: unknown;
  
  /**
   * Timestamp when the error occurred
   * @example '2023-04-01T12:00:00.000Z'
   */
  timestamp?: string;
  
  /**
   * Request path where the error occurred
   * @example '/api/users/123'
   */
  path?: string;
  
  /**
   * HTTP method of the request
   * @example 'GET', 'POST', 'PUT', 'DELETE'
   */
  method?: string;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  /**
   * Field that failed validation
   */
  field: string;
  
  /**
   * Validation error message
   */
  message: string;
  
  /**
   * Value that caused the validation error
   */
  value?: unknown;
  
  /**
   * Validation constraints that failed
   */
  constraints?: Record<string, string>;
}

/**
 * Validation error
 */
export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR';
  statusCode: 400;
  
  /**
   * List of validation errors
   */
  errors: ValidationErrorDetail[];
}

/**
 * Not found error
 */
export interface NotFoundError extends AppError {
  code: 'NOT_FOUND';
  statusCode: 404;
  
  /**
   * Type of resource that was not found
   */
  resourceType: string;
  
  /**
   * ID of the resource that was not found
   */
  resourceId: string | number;
}

/**
 * Unauthorized error
 */
export interface UnauthorizedError extends AppError {
  code: 'UNAUTHORIZED';
  statusCode: 401;
  
  /**
   * Authentication scheme
   */
  scheme?: string;
  
  /**
   * Authentication realm
   */
  realm?: string;
}

/**
 * Forbidden error
 */
export interface ForbiddenError extends AppError {
  code: 'FORBIDDEN';
  statusCode: 403;
  
  /**
   * Required permissions
   */
  requiredPermissions?: string[];
  
  /**
   * User's current permissions
   */
  userPermissions?: string[];
}

/**
 * Conflict error
 */
export interface ConflictError extends AppError {
  code: 'CONFLICT';
  statusCode: 409;
  
  /**
   * Resource type that caused the conflict
   */
  resourceType: string;
  
  /**
   * Field that caused the conflict
   */
  field: string;
  
  /**
   * Value that caused the conflict
   */
  value: unknown;
}

/**
 * Rate limit exceeded error
 */
export interface RateLimitExceededError extends AppError {
  code: 'RATE_LIMIT_EXCEEDED';
  statusCode: 429;
  
  /**
   * Time when the rate limit will reset (in milliseconds since epoch)
   */
  retryAfter: number;
  
  /**
   * Maximum number of requests allowed in the current period
   */
  limit: number;
  
  /**
   * Remaining number of requests in the current period
   */
  remaining: number;
  
  /**
   * Length of the rate limit window in seconds
   */
  window: number;
}
