import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../interfaces/error.interface';

/**
 * Interface for the error response structure
 */
interface ErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  error?: string;
  errors?: unknown;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Global exception filter that handles all HTTP exceptions and errors
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Handles exceptions and sends appropriate HTTP responses
   * @param exception - The exception that was thrown
   * @param host - Arguments host to access request/response objects
   */
  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).id as string | undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;
    let errors: unknown = null;
    let stack: string | undefined;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      // Extract message and errors from the exception response
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || exception.message;
        errors = responseObj.errors || null;
        error = responseObj.error as string;
      }
    } else if (exception instanceof Error) {
      // Handle standard Error objects
      message = exception.message || message;
      error = exception.name || 'Error';
      stack = exception.stack;
      
      // Check if it's a custom AppError
      if (this.isAppError(exception)) {
        const appError = exception as unknown as AppError;
        status = appError.statusCode || status;
        error = appError.code || error || 'Application Error';
      }
    }

    // Log the error with context
    this.logError(exception, request, status, message);

    // Prepare the error response
    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      error: error || HttpStatus[status] || 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Add additional error details if available
    if (errors) {
      errorResponse.errors = errors;
    }

    // Include request ID if available
    if (requestId) {
      errorResponse.requestId = requestId;
    }

    // In development, include stack trace
    if (process.env.NODE_ENV !== 'production' && stack) {
      errorResponse.stack = stack.split('\n').map(line => line.trim());
    }

    // Send the error response
    response.status(status).json(errorResponse);
  }

  /**
   * Logs the error with appropriate context
   * @param exception - The caught exception
   * @param request - The request object
   * @param status - HTTP status code
   * @param message - Error message
   */
  private logError(
    exception: unknown,
    request: Request,
    status: number,
    message: string
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const context = {
      statusCode: status,
      method,
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    const errorMessage = `HTTP ${status} - ${method} ${url} - ${message}`;

    if (status >= 500) {
      // Server errors (5xx)
      this.logger.error(
        errorMessage,
        exception instanceof Error ? exception.stack : undefined,
        context
      );
    } else if (status >= 400) {
      // Client errors (4xx)
      this.logger.warn(errorMessage, context);
    } else {
      // Other status codes
      this.logger.log(errorMessage, context);
    }
  }

  /**
   * Type guard to check if an error is an AppError
   * @param error - The error to check
   * @returns True if the error is an AppError
   */
  private isAppError(error: unknown): error is AppError {
    if (!(error instanceof Error)) {
      return false;
    }
    
    const appError = error as unknown as Partial<AppError>;
    return (
      typeof appError.code === 'string' &&
      typeof appError.statusCode === 'number' &&
      'message' in appError
    );
  }
}
