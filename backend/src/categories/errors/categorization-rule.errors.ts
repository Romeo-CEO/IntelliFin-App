import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../common/interfaces/error.interface';

export class CategorizationRuleNotFoundError extends Error implements AppError {
  public readonly code = 'CATEGORIZATION_RULE_NOT_FOUND';
  public readonly statusCode = HttpStatus.NOT_FOUND;

  constructor(id: string) {
    super(`Categorization rule with ID ${id} not found`);
    this.name = 'CategorizationRuleNotFoundError';
  }
}

export class RuleNameExistsError extends Error implements AppError {
  public readonly code = 'RULE_NAME_EXISTS';
  public readonly statusCode = HttpStatus.CONFLICT;

  constructor(name: string) {
    super(`A rule with the name '${name}' already exists`);
    this.name = 'RuleNameExistsError';
  }
}

export class InvalidRuleConditionsError extends Error implements AppError {
  public readonly code = 'INVALID_RULE_CONDITIONS';
  public readonly statusCode = HttpStatus.BAD_REQUEST;
  public readonly details: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(`Invalid rule conditions: ${message}`);
    this.name = 'InvalidRuleConditionsError';
    this.details = details || {};
  }
}

export class RuleInUseError extends Error implements AppError {
  public readonly code = 'RULE_IN_USE';
  public readonly statusCode = HttpStatus.CONFLICT;
  public readonly details: { matchCount: number };

  constructor(matchCount: number) {
    super('Cannot delete rule that has been used for categorization');
    this.name = 'RuleInUseError';
    this.details = { matchCount };
  }
}

export class InvalidRuleTypeError extends Error implements AppError {
  public readonly code = 'INVALID_RULE_TYPE';
  public readonly statusCode = HttpStatus.BAD_REQUEST;

  constructor(message: string) {
    super(`Invalid rule type: ${message}`);
    this.name = 'InvalidRuleTypeError';
  }
}

export class RuleValidationError extends Error implements AppError {
  public readonly code = 'RULE_VALIDATION_ERROR';
  public readonly statusCode = HttpStatus.BAD_REQUEST;
  public readonly details: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(`Rule validation failed: ${message}`);
    this.name = 'RuleValidationError';
    this.details = details || {};
  }
}
