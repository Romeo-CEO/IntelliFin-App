import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export interface RetryDecision {
  shouldRetry: boolean;
  delay: number;
  reason: string;
}

@Injectable()
export class RetryStrategy {
  private readonly logger = new Logger(RetryStrategy.name);

  private readonly defaultConfig: RetryConfig = {
    maxAttempts: 5,
    baseDelay: 3000, // 3 seconds
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_SERVER_ERROR',
      'BAD_GATEWAY',
      'GATEWAY_TIMEOUT',
    ],
    nonRetryableErrors: [
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'BAD_REQUEST',
      'INVALID_CREDENTIALS',
      'ACCOUNT_SUSPENDED',
      'INVALID_TOKEN',
      'VALIDATION_ERROR',
    ],
  };

  /**
   * Determine if a job should be retried based on error and attempt count
   */
  shouldRetryJob(job: Job, error: Error, config?: Partial<RetryConfig>): RetryDecision {
    const finalConfig = { ...this.defaultConfig, ...config };
    const attemptsMade = job.attemptsMade || 0;

    // Check if we've exceeded max attempts
    if (attemptsMade >= finalConfig.maxAttempts) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: `Maximum retry attempts (${finalConfig.maxAttempts}) exceeded`,
      };
    }

    // Check if error is non-retryable
    const errorType = this.categorizeError(error);
    if (finalConfig.nonRetryableErrors.includes(errorType)) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: `Non-retryable error type: ${errorType}`,
      };
    }

    // Check if error is explicitly retryable or if it's an unknown error
    const isRetryable = finalConfig.retryableErrors.includes(errorType) || 
                       !finalConfig.nonRetryableErrors.includes(errorType);

    if (!isRetryable) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: `Error type not configured for retry: ${errorType}`,
      };
    }

    // Calculate retry delay
    const delay = this.calculateRetryDelay(attemptsMade, finalConfig);

    this.logger.debug(
      `Job ${job.id} will be retried (attempt ${attemptsMade + 1}/${finalConfig.maxAttempts}) ` +
      `after ${delay}ms delay. Error: ${errorType}`
    );

    return {
      shouldRetry: true,
      delay,
      reason: `Retryable error: ${errorType}`,
    };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateRetryDelay(attemptNumber: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ attemptNumber)
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber);

    // Cap at maximum delay
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd problem
    if (config.jitterEnabled) {
      const jitterRange = 0.1; // ±10% jitter
      const jitter = (Math.random() * 2 - 1) * jitterRange * delay;
      delay = Math.max(0, delay + jitter);
    }

    return Math.floor(delay);
  }

  /**
   * Categorize error for retry decision making
   */
  private categorizeError(error: Error): string {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    // Network errors
    if (message.includes('econnreset') || name.includes('econnreset')) {
      return 'ECONNRESET';
    }
    if (message.includes('etimedout') || name.includes('etimedout')) {
      return 'ETIMEDOUT';
    }
    if (message.includes('enotfound') || name.includes('enotfound')) {
      return 'ENOTFOUND';
    }
    if (message.includes('econnrefused') || name.includes('econnrefused')) {
      return 'ECONNREFUSED';
    }

    // HTTP status-based errors
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'UNAUTHORIZED';
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return 'FORBIDDEN';
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'NOT_FOUND';
    }
    if (message.includes('400') || message.includes('bad request')) {
      return 'BAD_REQUEST';
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return 'RATE_LIMIT_EXCEEDED';
    }
    if (message.includes('500') || message.includes('internal server error')) {
      return 'INTERNAL_SERVER_ERROR';
    }
    if (message.includes('502') || message.includes('bad gateway')) {
      return 'BAD_GATEWAY';
    }
    if (message.includes('503') || message.includes('service unavailable')) {
      return 'SERVICE_UNAVAILABLE';
    }
    if (message.includes('504') || message.includes('gateway timeout')) {
      return 'GATEWAY_TIMEOUT';
    }

    // Application-specific errors
    if (message.includes('invalid token') || message.includes('token expired')) {
      return 'INVALID_TOKEN';
    }
    if (message.includes('invalid credentials')) {
      return 'INVALID_CREDENTIALS';
    }
    if (message.includes('account suspended') || message.includes('account blocked')) {
      return 'ACCOUNT_SUSPENDED';
    }
    if (message.includes('validation') || message.includes('invalid input')) {
      return 'VALIDATION_ERROR';
    }

    // Default to unknown error (will be treated as retryable)
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get retry configuration for specific job types
   */
  getConfigForJobType(jobType: string): Partial<RetryConfig> {
    switch (jobType) {
      case 'sync-account-transactions':
        return {
          maxAttempts: 5,
          baseDelay: 5000,
          maxDelay: 600000, // 10 minutes for transaction sync
        };
      
      case 'update-account-balance':
        return {
          maxAttempts: 3,
          baseDelay: 2000,
          maxDelay: 60000, // 1 minute for balance updates
        };
      
      case 'retry-failed-sync':
        return {
          maxAttempts: 3,
          baseDelay: 10000,
          maxDelay: 300000, // 5 minutes for retry operations
        };
      
      case 'send-sync-notification':
        return {
          maxAttempts: 2,
          baseDelay: 1000,
          maxDelay: 30000, // 30 seconds for notifications
        };
      
      default:
        return {};
    }
  }

  /**
   * Create a retry configuration for critical operations
   */
  getCriticalOperationConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 7,
      baseDelay: 10000,
      maxDelay: 900000, // 15 minutes
      backoffMultiplier: 1.5,
      jitterEnabled: true,
    };
  }

  /**
   * Create a retry configuration for non-critical operations
   */
  getNonCriticalOperationConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitterEnabled: false,
    };
  }

  /**
   * Log retry decision for monitoring and debugging
   */
  logRetryDecision(job: Job, error: Error, decision: RetryDecision): void {
    const logData = {
      jobId: job.id,
      jobType: job.name,
      attemptsMade: job.attemptsMade || 0,
      errorMessage: error.message,
      errorType: this.categorizeError(error),
      shouldRetry: decision.shouldRetry,
      delay: decision.delay,
      reason: decision.reason,
    };

    if (decision.shouldRetry) {
      this.logger.warn('Job will be retried', logData);
    } else {
      this.logger.error('Job will not be retried', logData);
    }
  }
}
