import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData } from '@/api/schemas';

export const tenantScopedRoleEnum = z.enum(['CREATOR', 'APPROVER']);
export type TenantScopedRole = z.infer<typeof tenantScopedRoleEnum>;

const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Tenant = z.infer<typeof tenantSchema>;

export async function listTenants() {
  const res = await apiClient.get(PATHS.tenants);
  return parseSuccessData(z.array(tenantSchema), res.data);
}

export const createTenantBodySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export type CreateTenantBody = z.infer<typeof createTenantBodySchema>;

export async function createTenant(body: CreateTenantBody) {
  const res = await apiClient.post(PATHS.tenants, createTenantBodySchema.parse(body));
  return parseSuccessData(tenantSchema, res.data);
}

export const tenantMemberScopedSchema = z.object({
  membershipId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  roles: z.array(tenantScopedRoleEnum),
  tenantIds: z.array(z.string()),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export type TenantMemberScoped = z.infer<typeof tenantMemberScopedSchema>;

export async function listTenantMembers(tenantId: string) {
  const res = await apiClient.get(PATHS.tenantMembers(tenantId));
  return parseSuccessData(z.array(tenantMemberScopedSchema), res.data);
}

export const addMemberBodySchema = z.object({
  email: z.string().email(),
  roles: z.array(tenantScopedRoleEnum).min(1),
});
export type AddMemberBody = z.infer<typeof addMemberBodySchema>;

export const patchMemberRolesBodySchema = z.object({
  roles: z.array(tenantScopedRoleEnum).min(1),
});

export async function addTenantMember(tenantId: string, body: AddMemberBody) {
  const res = await apiClient.post(PATHS.tenantMembers(tenantId), addMemberBodySchema.parse(body));
  return parseSuccessData(tenantMemberScopedSchema, res.data);
}

export async function patchTenantMemberRoles(tenantId: string, userId: string, body: z.infer<typeof patchMemberRolesBodySchema>) {
  const res = await apiClient.patch(PATHS.tenantMember(tenantId, userId), patchMemberRolesBodySchema.parse(body));
  return parseSuccessData(tenantMemberScopedSchema, res.data);
}

export async function removeTenantMember(tenantId: string, userId: string) {
  await apiClient.delete(PATHS.tenantMember(tenantId, userId));
}
