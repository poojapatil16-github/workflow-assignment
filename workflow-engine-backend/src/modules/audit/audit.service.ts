import type { AuditAction, Prisma } from '../../prisma.js';
import { prisma } from '../../config/prisma.js';

type Tx = Prisma.TransactionClient;

export async function appendAudit(
  tx: Tx,
  input: {
    tenantId: string;
    action: AuditAction;
    actorId?: string | null;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      action: input.action,
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
    },
  });
}

export async function listAuditLogs(params: {
  tenantId: string;
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}) {
  const where = {
    tenantId: params.tenantId,
    ...(params.search
      ? {
          OR: [
            { entityType: { contains: params.search, mode: 'insensitive' as const } },
            { entityId: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const orderField =
    params.sortBy && ['action', 'entityType', 'createdAt'].includes(params.sortBy)
      ? (params.sortBy as 'action' | 'entityType' | 'createdAt')
      : 'createdAt';
  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { [orderField]: params.sortOrder },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
  ]);
  return { rows, total };
}
