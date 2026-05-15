import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData, parseSuccessMeta } from '@/api/schemas';

const slaRowSchema = z.record(z.string(), z.unknown()).and(
  z.object({
    id: z.string(),
    name: z.string(),
    durationMinutes: z.number(),
    enabled: z.boolean(),
  }),
);
export type SlaRuleRow = z.infer<typeof slaRowSchema>;

export const listSlaQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type ListSlaQuery = z.infer<typeof listSlaQuerySchema>;

export async function listSlaRules(params: ListSlaQuery) {
  const res = await apiClient.get(PATHS.slaRules, { params });
  const data = parseSuccessData(z.array(slaRowSchema), res.data);
  const meta = parseSuccessMeta(res.data);
  return { data, meta };
}

export const createSlaBodySchema = z.object({
  workflowVersionId: z.string().uuid(),
  workflowStateId: z.string().uuid(),
  name: z.string().min(1).max(120),
  durationMinutes: z.number().int().min(1),
  escalateToUserId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});
export type CreateSlaBody = z.infer<typeof createSlaBodySchema>;

export async function createSlaRule(body: CreateSlaBody) {
  const res = await apiClient.post(PATHS.slaRules, createSlaBodySchema.parse(body));
  return parseSuccessData(slaRowSchema, res.data);
}

export async function getSlaBreaches(tenantId: string) {
  const res = await apiClient.get(PATHS.slaBreaches(tenantId));
  return parseSuccessData(z.array(z.any()), res.data);
}

export async function escalateItem(itemId: string, slaRuleId: string) {
  const res = await apiClient.post(PATHS.slaEscalate(itemId), { slaRuleId });
  return parseSuccessData(z.any(), res.data);
}
