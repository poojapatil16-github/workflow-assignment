import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData } from '@/api/schemas';

const delegationSchema = z.record(z.string(), z.unknown()).and(
  z.object({
    id: z.string(),
    tenantId: z.string(),
    fromUserId: z.string(),
    toUserId: z.string(),
    active: z.boolean().optional(),
    createdAt: z.string().optional(),
  }),
);
export type Delegation = z.infer<typeof delegationSchema>;

export async function listDelegations() {
  const res = await apiClient.get(PATHS.delegations);
  return parseSuccessData(z.array(delegationSchema), res.data);
}

export const createDelegationBodySchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateDelegationBody = z.infer<typeof createDelegationBodySchema>;

export async function createDelegation(body: CreateDelegationBody) {
  const res = await apiClient.post(PATHS.delegations, createDelegationBodySchema.parse(body));
  return parseSuccessData(delegationSchema, res.data);
}
