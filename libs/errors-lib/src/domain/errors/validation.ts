import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export interface ValidationIssue {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[], context?: Record<string, unknown>) {
    super('Validation failed', 422, ErrorCode.VALIDATION_ERROR, { issues, ...context });
    this.issues = issues;
    this.name = 'ValidationError';
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      issues: this.issues,
    };
  }
}
