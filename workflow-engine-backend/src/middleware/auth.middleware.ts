import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { GlobalRole } from '../prisma.js';
import { env } from '../config/env.js';
import { Errors } from '../common/errors/AppError.js';

type JwtPayload = {
  sub?: string;
  userId?: string;
  email: string;
  globalRole?: GlobalRole;
};

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(Errors.unauthorized('Missing bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(Errors.unauthorized('Missing bearer token'));
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const userId = decoded.userId ?? decoded.sub;
    if (!userId || !decoded.email) {
      return next(Errors.unauthorized('Invalid token payload'));
    }
    const globalRole: GlobalRole = decoded.globalRole === 'ADMIN' ? 'ADMIN' : 'USER';
    req.auth = { userId, email: decoded.email, globalRole };
    
    import('../common/logger/logger.js').then(({ loggerContext }) => {
      loggerContext.update({ userId });
    });

    next();
  } catch {
    next(Errors.unauthorized('Invalid or expired token'));
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }
  authMiddleware(req, _res, next);
}
