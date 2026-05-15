export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
  return {
    success: true as const,
    data,
    meta: meta ?? {},
  };
}

export function errorResponse(message: string, errors: unknown[] = []) {
  return {
    success: false as const,
    message,
    errors,
  };
}
