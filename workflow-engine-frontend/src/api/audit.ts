import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData, parseSuccessMeta } from '@/api/schemas';

const auditRowSchema = z.record(z.string(), z.unknown()).and(
  z.object({
    id: z.string(),
    tenantId: z.string(),
    action: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    createdAt: z.string(),
  }),
);
export type AuditLogRow = z.infer<typeof auditRowSchema>;

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

export async function listAuditLogs(params: ListAuditQuery) {
  const res = await apiClient.get(PATHS.auditLogs, { params });
  const data = parseSuccessData(z.array(auditRowSchema), res.data);
  const meta = parseSuccessMeta(res.data);
  return { data, meta };
}
