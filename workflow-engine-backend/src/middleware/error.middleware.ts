import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/AppError.js';
import { errorResponse } from '../common/responses/api-response.js';
import { logger } from '../common/logger/logger.js';

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`AppError ${err.statusCode}: ${err.message}`, { err, code: err.code });
    } else {
      logger.warn(`AppError ${err.statusCode}: ${err.message}`, { code: err.code });
    }
    return res.status(err.statusCode).json(
      errorResponse(err.message, err.details ? [err.details] : [{ code: err.code }]),
    );
  }
  if (err instanceof ZodError) {
    logger.warn('Validation failed (Zod)', { issues: err.issues });
    return res.status(400).json(errorResponse('Validation failed', [err.flatten()]));
  }
  
  const requestId = req.requestId;
  logger.error('Unhandled error', { 
    err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    path: req.path,
    method: req.method,
    body: req.method !== 'GET' ? req.body : undefined
  });
  
  return res.status(500).json(errorResponse('Internal server error', [{ requestId }]));
}
