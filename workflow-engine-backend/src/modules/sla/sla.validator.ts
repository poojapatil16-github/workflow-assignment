import { z } from 'zod';

export const createSlaRuleBodySchema = z.object({
  workflowVersionId: z.string().uuid(),
  workflowStateId: z.string().uuid(),
  name: z.string().min(1).max(120),
  durationMinutes: z.coerce.number().int().min(1),
  escalateToUserId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true),
});

export const listSlaRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const escalateItemBodySchema = z.object({
  slaRuleId: z.string().uuid(),
});
