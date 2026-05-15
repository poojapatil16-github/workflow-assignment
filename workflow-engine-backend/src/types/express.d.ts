import type { GlobalRole, TenantScopedRole } from '../prisma.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        email: string;
        globalRole: GlobalRole;
      };
      tenantId?: string;
      /** Effective tenant-scoped privileges for X-Tenant-Id (ADMIN users get CREATOR + APPROVER implicitly). */
      tenantScopedRoles?: TenantScopedRole[];
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

export {};
