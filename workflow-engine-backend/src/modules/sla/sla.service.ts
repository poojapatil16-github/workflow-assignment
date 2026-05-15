import type { Prisma } from '../../prisma.js';
import { prisma } from '../../config/prisma.js';
import { Errors } from '../../common/errors/AppError.js';
import { appendAudit } from '../audit/audit.service.js';
import { logger } from '../../common/logger/logger.js';

export async function createSlaRule(params: {
  tenantId: string;
  actorId: string;
  workflowVersionId: string;
  workflowStateId: string;
  name: string;
  durationMinutes: number;
  escalateToUserId?: string;
  metadata?: Prisma.InputJsonValue;
  enabled: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.workflowVersion.findFirst({
      where: {
        id: params.workflowVersionId,
        workflow: { tenantId: params.tenantId },
      },
      include: { states: true },
    });
    if (!version) {
      logger.warn('[SLAEngine] SLA rule creation failed: workflow version not found', { workflowVersionId: params.workflowVersionId });
      throw Errors.notFound('Workflow version');
    }
    const state = version.states.find((s) => s.id === params.workflowStateId);
    if (!state) {
      logger.warn('[SLAEngine] SLA rule creation failed: state does not belong to version', { workflowStateId: params.workflowStateId, workflowVersionId: params.workflowVersionId });
      throw Errors.validation('workflowStateId must belong to the workflow version');
    }
    const rule = await tx.slaRule.create({
      data: {
        tenantId: params.tenantId,
        workflowVersionId: params.workflowVersionId,
        workflowStateId: params.workflowStateId,
        name: params.name,
        durationMinutes: params.durationMinutes,
        escalateToUserId: params.escalateToUserId,
        metadata: params.metadata ?? undefined,
        enabled: params.enabled,
      },
    });
    await appendAudit(tx, {
      tenantId: params.tenantId,
      action: 'SLA_RULE_CREATED',
      actorId: params.actorId,
      entityType: 'sla_rule',
      entityId: rule.id,
      metadata: { name: rule.name, durationMinutes: rule.durationMinutes },
    });
    logger.info('[SLAEngine] SLA rule created', { slaRuleId: rule.id, name: rule.name, durationMinutes: rule.durationMinutes });
    return rule;
  });
}

export async function getSlaBreaches(tenantId: string) {
  const items = await prisma.item.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      workflowVersion: {
        include: {
          slaRules: true,
        },
      },
      escalations: true,
    },
  });

  const breaches = [];
  const now = new Date();

  for (const item of items) {
    const rules = item.workflowVersion.slaRules.filter(
      (r) => r.enabled && r.workflowStateId === item.currentStateId,
    );

    for (const rule of rules) {
      const alreadyEscalated = item.escalations.some((e) => e.slaRuleId === rule.id);
      if (alreadyEscalated) continue;

      const overdueAt = new Date(item.updatedAt.getTime() + rule.durationMinutes * 60000);
      if (now > overdueAt) {
        logger.info('[SLAEngine] SLA breach detected', { itemId: item.id, slaRuleId: rule.id, overdueByMinutes: Math.floor((now.getTime() - overdueAt.getTime()) / 60000) });
        breaches.push({
          item,
          rule,
          overdueByMinutes: Math.floor((now.getTime() - overdueAt.getTime()) / 60000),
        });
      }
    }
  }

  return breaches;
}

export async function escalateItem(params: {
  tenantId: string;
  actorId: string;
  itemId: string;
  slaRuleId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: params.itemId } });
    if (!item || item.tenantId !== params.tenantId) {
      logger.warn('[SLAEngine] Escalation failed: item not found', { itemId: params.itemId });
      throw Errors.notFound('Item');
    }

    const escalation = await tx.escalation.create({
      data: {
        tenantId: params.tenantId,
        itemId: params.itemId,
        slaRuleId: params.slaRuleId,
        status: 'ESCALATED',
      },
    });

    await appendAudit(tx, {
      tenantId: params.tenantId,
      action: 'SLA_ESCALATION',
      actorId: params.actorId,
      entityType: 'item',
      entityId: params.itemId,
      metadata: { slaRuleId: params.slaRuleId, escalationId: escalation.id },
    });

    logger.info('[SLAEngine] Item escalated successfully', { itemId: params.itemId, slaRuleId: params.slaRuleId, escalationId: escalation.id });

    return escalation;
  });
}

export async function listSlaRules(
  tenantId: string,
  query: { page: number; limit: number; search?: string; sortOrder: 'asc' | 'desc' },
) {
  const where = {
    tenantId,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { id: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.slaRule.count({ where }),
    prisma.slaRule.findMany({
      where,
      orderBy: { createdAt: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        workflowVersion: { select: { id: true, version: true, workflowId: true } },
        workflowState: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { rows, total };
}

/**
 * Placeholder hook for schedulers/workers. Records an immutable audit entry for SLA escalation readiness.
 */
export async function recordSlaEscalationAudit(input: {
  tenantId: string;
  actorId?: string | null;
  slaRuleId: string;
  itemId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.$transaction(async (tx) => {
    return appendAudit(tx, {
      tenantId: input.tenantId,
      action: 'SLA_ESCALATION',
      actorId: input.actorId ?? null,
      entityType: 'item',
      entityId: input.itemId,
      metadata: {
        slaRuleId: input.slaRuleId,
        details: input.metadata ?? null,
      } as Prisma.InputJsonValue,
    });
  });
}
