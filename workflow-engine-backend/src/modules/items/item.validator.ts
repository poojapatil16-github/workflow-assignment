import { z } from 'zod';

export const createItemBodySchema = z.object({
  workflowId: z.string().uuid(),
  workflowVersionId: z.string().uuid(),
  title: z.string().max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(['createdAt', 'title', 'version']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const itemIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const transitionBodySchema = z.object({
  transitionId: z.string().uuid(),
  clientVersion: z.coerce.number().int().min(1),
  comment: z.string().max(2000).optional(),
});
