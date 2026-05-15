import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData, parseSuccessMeta } from '@/api/schemas';

const versionSummarySchema = z.object({
  id: z.string(),
  version: z.number(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  publishedAt: z.string().nullable().optional(),
});

const workflowListRowSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  versions: z.array(versionSummarySchema).optional(),
});
export type WorkflowListRow = z.infer<typeof workflowListRowSchema>;

export const listWorkflowsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;

export async function listWorkflows(params: ListWorkflowsQuery) {
  const res = await apiClient.get(PATHS.workflows, { params });
  const data = parseSuccessData(z.array(workflowListRowSchema), res.data);
  const meta = parseSuccessMeta(res.data);
  return { data, meta };
}

/** Full workflow graph from GET /workflows/:id — passthrough nested Prisma payload. */
export const workflowDetailSchema = z
  .object({
    id: z.string(),
    tenantId: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    versions: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();
export type WorkflowDetail = z.infer<typeof workflowDetailSchema>;

export async function getWorkflow(id: string) {
  const res = await apiClient.get(PATHS.workflow(id));
  return parseSuccessData(workflowDetailSchema, res.data);
}

export const createWorkflowBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  definition: z.record(z.string(), z.unknown()),
});
export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;

export async function createWorkflow(body: CreateWorkflowBody) {
  const res = await apiClient.post(PATHS.workflows, createWorkflowBodySchema.parse(body));
  return parseSuccessData(z.record(z.string(), z.unknown()), res.data);
}

export async function createWorkflowVersion(workflowId: string, body: { definition?: Record<string, unknown> }) {
  const res = await apiClient.post(PATHS.workflowVersion(workflowId), body);
  return parseSuccessData(z.record(z.string(), z.unknown()), res.data);
}

export const publishWorkflowBodySchema = z.object({
  versionId: z.string().uuid(),
});
export type PublishWorkflowBody = z.infer<typeof publishWorkflowBodySchema>;

export async function publishWorkflow(workflowId: string, body: PublishWorkflowBody) {
  const res = await apiClient.post(PATHS.workflowPublish(workflowId), publishWorkflowBodySchema.parse(body));
  return parseSuccessData(z.record(z.string(), z.unknown()), res.data);
}
