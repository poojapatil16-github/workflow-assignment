import { z } from 'zod';

export const approvalDecisionBodySchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const approvalIdParamsSchema = z.object({
  id: z.string().uuid(),
});
