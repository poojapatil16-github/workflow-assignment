import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData, parseSuccessMeta } from '@/api/schemas';

const itemListRowSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workflowId: z.string(),
  workflowVersionId: z.string(),
  currentStateId: z.string(),
  title: z.string().nullable().optional(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentState: z.record(z.string(), z.unknown()).optional(),
  workflow: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .passthrough()
    .optional(),
  workflowVersion: z
    .object({
      id: z.string(),
      version: z.number(),
      status: z.string(),
    })
    .passthrough()
    .optional(),
});
export type ItemListRow = z.infer<typeof itemListRowSchema>;

export const listItemsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'title', 'version']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

export async function listItems(params: ListItemsQuery) {
  const res = await apiClient.get(PATHS.items, { params });
  const data = parseSuccessData(z.array(itemListRowSchema), res.data);
  const meta = parseSuccessMeta(res.data);
  return { data, meta };
}

export const itemDetailSchema = z
  .object({
    id: z.string(),
    currentStateId: z.string(),
    workflowVersionId: z.string().optional(),
    workflowId: z.string().optional(),
    tenantId: z.string().optional(),
    title: z.string().nullable().optional(),
    version: z.number(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();
export type ItemDetail = z.infer<typeof itemDetailSchema>;

export async function getItem(id: string) {
  const res = await apiClient.get(PATHS.item(id));
  return parseSuccessData(itemDetailSchema, res.data);
}

export const createItemBodySchema = z.object({
  workflowId: z.string().uuid(),
  workflowVersionId: z.string().uuid(),
  title: z.string().max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type CreateItemBody = z.infer<typeof createItemBodySchema>;

export async function createItem(body: CreateItemBody) {
  const res = await apiClient.post(PATHS.items, createItemBodySchema.parse(body));
  return parseSuccessData(itemDetailSchema, res.data);
}

export const transitionBodySchema = z.object({
  transitionId: z.string().uuid(),
  clientVersion: z.number().int().min(1),
  comment: z.string().max(2000).optional(),
});
export type TransitionBody = z.infer<typeof transitionBodySchema>;

export async function transitionItem(itemId: string, body: TransitionBody, idempotencyKey?: string) {
  const res = await apiClient.post(PATHS.itemTransitions(itemId), transitionBodySchema.parse(body), {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
  return parseSuccessData(z.record(z.string(), z.unknown()), res.data);
}
