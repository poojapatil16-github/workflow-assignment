import { randomUUID } from 'node:crypto';

export function createRequestId(headerValue?: string | string[]): string {
  if (!headerValue) return randomUUID();
  const v = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const trimmed = v?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : randomUUID();
}
