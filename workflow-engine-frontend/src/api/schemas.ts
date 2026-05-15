import { z } from 'zod';

/** Matches backend `successResponse` / OpenAPI `SuccessEnvelope`. */
export const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

/** Matches backend `errorResponse` / OpenAPI `ErrorEnvelope`. */
export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(z.unknown()).optional(),
});

export type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };

export function parseSuccessData<T>(dataSchema: z.ZodType<T>, body: unknown): T {
  const env = successEnvelopeSchema.parse(body);
  return dataSchema.parse(env.data);
}

export function parseSuccessRaw(body: unknown): unknown {
  const env = successEnvelopeSchema.parse(body);
  return env.data;
}

export function parseSuccessMeta(body: unknown): Record<string, unknown> | undefined {
  const env = successEnvelopeSchema.parse(body);
  return env.meta;
}
