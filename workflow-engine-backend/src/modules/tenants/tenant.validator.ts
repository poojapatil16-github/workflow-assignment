import { z } from 'zod';

export const tenantScopedRoleSchema = z.enum(['CREATOR', 'APPROVER']);

export const createTenantBodySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

/** Platform admins assign CREATOR/APPROVER per tenant. */
export const addMemberBodySchema = z.object({
  email: z.string().email(),
  roles: z.array(tenantScopedRoleSchema).min(1),
});

export const patchMemberRolesBodySchema = z.object({
  roles: z.array(tenantScopedRoleSchema).min(1),
});

export const tenantIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const tenantAndMemberUserParamsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});
