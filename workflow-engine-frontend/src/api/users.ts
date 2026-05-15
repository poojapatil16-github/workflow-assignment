import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData } from '@/api/schemas';

const tenantScopedRoleEnum = z.enum(['CREATOR', 'APPROVER']);

export const userDirectoryRowSchema = z.object({
  membershipId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  roles: z.array(tenantScopedRoleEnum),
  tenantIds: z.array(z.string()),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export type UserDirectoryRow = z.infer<typeof userDirectoryRowSchema>;

export async function listTenantDirectory() {
  const res = await apiClient.get(PATHS.users);
  return parseSuccessData(z.array(userDirectoryRowSchema), res.data);
}
