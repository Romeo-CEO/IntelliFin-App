import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../common/interfaces/error.interface';

export class CategoryNotFoundError extends Error implements AppError {
  public readonly code = 'CATEGORY_NOT_FOUND';
  public readonly statusCode = HttpStatus.NOT_FOUND;

  constructor(id: string) {
    super(`Category with ID ${id} not found`);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryNameExistsError extends Error implements AppError {
  public readonly code = 'CATEGORY_NAME_EXISTS';
  public readonly statusCode = HttpStatus.CONFLICT;

  constructor(name: string, parentId?: string) {
    const context = parentId ? ` under parent ${parentId}` : '';
    super(`A category with the name '${name}' already exists${context}`);
    this.name = 'CategoryNameExistsError';
  }
}

export class InvalidCategoryHierarchyError extends Error implements AppError {
  public readonly code = 'INVALID_CATEGORY_HIERARCHY';
  public readonly statusCode = HttpStatus.BAD_REQUEST;

  constructor(message: string) {
    super(`Invalid category hierarchy: ${message}`);
    this.name = 'InvalidCategoryHierarchyError';
  }
}

export class CategoryInUseError extends Error implements AppError {
  public readonly code = 'CATEGORY_IN_USE';
  public readonly statusCode = HttpStatus.CONFLICT;
  public readonly details: { transactionCount: number };

  constructor(transactionCount: number) {
    super('Cannot delete category that is in use by transactions');
    this.name = 'CategoryInUseError';
    this.details = { transactionCount };
  }
}

export class CircularCategoryDependencyError extends Error implements AppError {
  public readonly code = 'CIRCULAR_CATEGORY_DEPENDENCY';
  public readonly statusCode = HttpStatus.BAD_REQUEST;
  public readonly parentId?: string;
  public readonly childId?: string;

  constructor(parentId?: string, childId?: string) {
    super(
      parentId && childId 
        ? `Circular category dependency detected between category ${parentId} and its child ${childId}`
        : 'Circular category dependency detected'
    );
    this.name = 'CircularCategoryDependencyError';
    this.parentId = parentId;
    this.childId = childId;
  }
}

export class InvalidCategoryTypeError extends Error implements AppError {
  public readonly code = 'INVALID_CATEGORY_TYPE';
  public readonly statusCode = HttpStatus.BAD_REQUEST;

  constructor(message: string) {
    super(`Invalid category type: ${message}`);
    this.name = 'InvalidCategoryTypeError';
  }
}
