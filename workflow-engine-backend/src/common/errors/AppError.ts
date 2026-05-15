export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'TENANT_MISMATCH'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONCURRENCY_CONFLICT'
  | 'INVALID_TRANSITION'
  | 'WORKFLOW_INVALID'
  | 'DUPLICATE_APPROVAL'
  | 'APPROVAL_CONFLICT'
  | 'INTERNAL';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options?: { cause?: unknown; details?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
  }
}

export const Errors = {
  unauthorized: (message = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Forbidden') => new AppError(403, 'FORBIDDEN', message),
  validation: (message: string, details?: unknown) =>
    new AppError(400, 'VALIDATION_ERROR', message, { details }),
  tenantMismatch: (message = 'Tenant mismatch or missing membership') =>
    new AppError(403, 'TENANT_MISMATCH', message),
  notFound: (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} not found`),
  conflict: (message: string, details?: unknown) =>
    new AppError(409, 'CONFLICT', message, { details }),
  concurrency: (message = 'Resource was modified by another request') =>
    new AppError(409, 'CONCURRENCY_CONFLICT', message),
  invalidTransition: (message: string, details?: unknown) =>
    new AppError(400, 'INVALID_TRANSITION', message, { details }),
  workflowInvalid: (message: string, details?: unknown) =>
    new AppError(400, 'WORKFLOW_INVALID', message, { details }),
  duplicateApproval: (message = 'Duplicate approval') =>
    new AppError(409, 'DUPLICATE_APPROVAL', message),
  approvalConflict: (message: string) => new AppError(409, 'APPROVAL_CONFLICT', message),
  internal: (message = 'Internal server error') => new AppError(500, 'INTERNAL', message),
} as const;
