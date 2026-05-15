import { z } from 'zod';

export const createDelegationBodySchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
