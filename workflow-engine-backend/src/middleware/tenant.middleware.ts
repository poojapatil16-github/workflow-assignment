import type { TenantScopedRole } from '../prisma.js';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { HEADER_TENANT_ID } from '../common/constants/http.js';
import { Errors } from '../common/errors/AppError.js';

import { loggerContext } from '../common/logger/logger.js';

const ALL_EFFECTIVE_SCOPES: TenantScopedRole[] = ['CREATOR', 'APPROVER'];

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    return next(Errors.unauthorized());
  }
  const raw = req.headers[HEADER_TENANT_ID] ?? req.headers['x-tenant-id'];
  const tenantHeader = Array.isArray(raw) ? raw[0] : raw;
  if (!tenantHeader || typeof tenantHeader !== 'string') {
    return next(Errors.validation('Missing X-Tenant-Id header'));
  }
  const parsedId = z.string().uuid().safeParse(tenantHeader.trim());
  if (!parsedId.success) {
    return next(Errors.validation('Invalid X-Tenant-Id'));
  }
  const tenantId = parsedId.data;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) {
    return next(Errors.notFound('Tenant'));
  }

  if (req.auth.globalRole === 'ADMIN') {
    req.tenantId = tenantId;
    req.tenantScopedRoles = [...ALL_EFFECTIVE_SCOPES];
    loggerContext.update({ tenantId });
    return next();
  }

  const membership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: req.auth.userId } },
    select: { roles: true },
  });
  if (!membership || membership.roles.length === 0) {
    return next(Errors.tenantMismatch());
  }

  req.tenantId = tenantId;
  req.tenantScopedRoles = membership.roles;
  loggerContext.update({ tenantId });
  next();
}

export function requireGlobalAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.globalRole !== 'ADMIN') {
    return next(Errors.forbidden('Platform administrator required'));
  }
  next();
}

/** Any of the listed tenant scopes (effective roles include ADMIN implicit full access). */
export function requireAnyTenantScopedRole(...roles: TenantScopedRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const effective = req.tenantScopedRoles ?? [];
    if (!roles.some((r) => effective.includes(r))) {
      return next(Errors.forbidden('Insufficient tenant permissions'));
    }
    next();
  };
}

export function requireTenantCreator(req: Request, _res: Response, next: NextFunction) {
  const effective = req.tenantScopedRoles ?? [];
  if (!effective.includes('CREATOR')) {
    return next(Errors.forbidden('Creator role required for this action'));
  }
  next();
}

export function requireTenantApprover(req: Request, _res: Response, next: NextFunction) {
  const effective = req.tenantScopedRoles ?? [];
  if (!effective.includes('APPROVER')) {
    return next(Errors.forbidden('Approver role required for this action'));
  }
  next();
}
