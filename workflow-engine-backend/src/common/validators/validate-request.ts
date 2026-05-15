import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { Errors } from '../errors/AppError.js';

type Target = 'body' | 'query' | 'params';
type AttachKey = 'validatedBody' | 'validatedQuery' | 'validatedParams';

const attachMap: Record<Target, AttachKey> = {
  body: 'validatedBody',
  query: 'validatedQuery',
  params: 'validatedParams',
};

export function validateRequest<T extends ZodTypeAny>(schema: T, source: Target = 'body') {
  const key = attachMap[source];
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(Errors.validation('Validation failed', parsed.error.flatten()));
    }
    req[key] = parsed.data;
    next();
  };
}

export function getValidatedBody<T>(req: Request): T {
  return req.validatedBody as T;
}

export function getValidatedQuery<T>(req: Request): T {
  return req.validatedQuery as T;
}

export function getValidatedParams<T>(req: Request): T {
  return req.validatedParams as T;
}
