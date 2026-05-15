import type { Prisma } from '../../prisma.js';
import { prisma } from '../../config/prisma.js';
import { Errors } from '../../common/errors/AppError.js';
import { appendAudit } from '../audit/audit.service.js';
import { logger } from '../../common/logger/logger.js';

export async function createItem(params: {
  tenantId: string;
  actorId: string;
  workflowId: string;
  workflowVersionId: string;
  title?: string;
  data?: Prisma.InputJsonValue;
}) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.workflowVersion.findFirst({
      where: {
        id: params.workflowVersionId,
        workflowId: params.workflowId,
        workflow: { tenantId: params.tenantId },
        status: 'PUBLISHED',
      },
      include: { states: true },
    });
    if (!version) {
      logger.warn('[WorkflowEngine] Workflow creation failed: published version not found or tenant mismatch', { workflowId: params.workflowId, workflowVersionId: params.workflowVersionId, tenantId: params.tenantId });
      throw Errors.validation('Workflow version must be published and belong to tenant');
    }
    const initial = version.states.find((s) => s.isInitial);
    if (!initial) {
      logger.error('[WorkflowEngine] Workflow creation failed: no initial state in published version', { workflowVersionId: version.id });
      throw Errors.workflowInvalid('Published version missing initial state');
    }
    const item = await tx.item.create({
      data: {
        tenantId: params.tenantId,
        workflowId: params.workflowId,
        workflowVersionId: version.id,
        currentStateId: initial.id,
        title: params.title,
        data: params.data ?? undefined,
        createdById: params.actorId,
        version: 1,
      },
    });
    await appendAudit(tx, {
      tenantId: params.tenantId,
      action: 'ITEM_CREATED',
      actorId: params.actorId,
      entityType: 'item',
      entityId: item.id,
      metadata: { workflowId: params.workflowId, workflowVersionId: version.id },
    });
    logger.info('[WorkflowEngine] Workflow item created', { itemId: item.id, workflowId: params.workflowId, initialStateId: initial.id });
    return item;
  });
}

export async function listItems(
  tenantId: string,
  query: { page: number; limit: number; search?: string; sortBy: string; sortOrder: 'asc' | 'desc' },
) {
  const where = {
    tenantId,
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' as const } },
            { id: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const sortField = ['createdAt', 'title', 'version'].includes(query.sortBy)
    ? (query.sortBy as 'createdAt' | 'title' | 'version')
    : 'createdAt';
  const [total, rows] = await prisma.$transaction([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: { [sortField]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        currentState: true,
        workflow: { select: { id: true, name: true } },
        workflowVersion: { select: { id: true, version: true, status: true } },
      },
    }),
  ]);
  return { rows, total };
}

export async function getItem(tenantId: string, itemId: string) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, tenantId },
    include: {
      currentState: true,
      workflow: true,
      workflowVersion: { include: { transitions: true, states: true } },
      transitions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!item) throw Errors.notFound('Item');
  return item;
}

export async function applyTransition(input: {
  tenantId: string;
  actorUserId: string;
  itemId: string;
  transitionId: string;
  clientVersion: number;
  comment?: string;
  idempotencyKey?: string | null;
}) {
  if (input.idempotencyKey) {
    const cached = await prisma.itemTransition.findFirst({
      where: { itemId: input.itemId, idempotencyKey: input.idempotencyKey },
      include: { item: true },
    });
    if (cached) {
      return { duplicate: true as const, transition: cached, item: cached.item };
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const cached = await tx.itemTransition.findFirst({
          where: { itemId: input.itemId, idempotencyKey: input.idempotencyKey },
          include: { item: true },
        });
        if (cached) {
          return { duplicate: true as const, transition: cached, item: cached.item };
        }
      }

      const item = await tx.item.findFirst({
        where: { id: input.itemId, tenantId: input.tenantId },
        include: {
          workflowVersion: true,
        },
      });
      if (!item) {
        logger.warn('[WorkflowEngine] Transition failed: item not found', { itemId: input.itemId });
        throw Errors.notFound('Item');
      }
      if (item.status !== 'ACTIVE') {
        logger.warn('[WorkflowEngine] Transition failed: item not active', { itemId: item.id, status: item.status });
        throw Errors.validation('Cannot apply transition on a non-active item');
      }
      if (item.version !== input.clientVersion) {
        logger.warn('[WorkflowEngine] Transition failed: concurrency version mismatch', { itemId: item.id, clientVersion: input.clientVersion, serverVersion: item.version });
        throw Errors.concurrency('Item version mismatch');
      }
      if (item.workflowVersion.status !== 'PUBLISHED') {
        throw Errors.invalidTransition('Item is bound to a non-published workflow version');
      }

      const transition = await tx.workflowTransition.findFirst({
        where: {
          id: input.transitionId,
          workflowVersionId: item.workflowVersionId,
        },
        include: {
          toState: true,
        },
      });
      if (!transition) {
        logger.warn('[WorkflowEngine] Transition failed: transition not found in version', { itemId: item.id, transitionId: input.transitionId, versionId: item.workflowVersionId });
        throw Errors.invalidTransition('Transition does not belong to item workflow version');
      }
      if (transition.fromStateId !== item.currentStateId) {
        logger.warn('[WorkflowEngine] Transition failed: invalid fromState', { itemId: item.id, transitionId: transition.id, itemState: item.currentStateId, transitionFromState: transition.fromStateId });
        throw Errors.invalidTransition('Transition is not valid from current state');
      }

      if (transition.requiresApproval) {
        const approverIds = Array.from(
          new Set((transition.approverUserIds as string[]) ?? []),
        );
        if (!approverIds.length) {
          throw Errors.workflowInvalid('Transition requires approval but has no approvers');
        }
        await assertTenantMembers(tx, input.tenantId, approverIds);

        const pending = await tx.approval.findFirst({
          where: { itemId: item.id, workflowTransitionId: transition.id, status: 'PENDING' },
        });
        if (pending) {
          throw Errors.approvalConflict('An approval is already pending for this transition');
        }

        const approval = await tx.approval.create({
          data: {
            tenantId: input.tenantId,
            itemId: item.id,
            workflowTransitionId: transition.id,
            mode: transition.approvalMode!,
            quorumRequired:
              transition.approvalMode === 'QUORUM' ? transition.quorumCount ?? 1 : null,
          },
        });
        await tx.approvalVote.createMany({
          data: approverIds.map((assigneeUserId) => ({ approvalId: approval.id, assigneeUserId })),
          skipDuplicates: true,
        });

        const transitionRow = await tx.itemTransition.create({
          data: {
            tenantId: input.tenantId,
            itemId: item.id,
            workflowTransitionId: transition.id,
            fromStateId: item.currentStateId,
            toStateId: null,
            performedById: input.actorUserId,
            idempotencyKey: input.idempotencyKey ?? undefined,
            comment: input.comment,
            metadata: { pendingApprovalId: approval.id, result: 'PENDING_APPROVAL' },
          },
        });

        await appendAudit(tx, {
          tenantId: input.tenantId,
          action: 'APPROVAL_CREATED',
          actorId: input.actorUserId,
          entityType: 'approval',
          entityId: approval.id,
          metadata: { itemId: item.id, transitionId: transition.id },
        });

        logger.info('[WorkflowEngine] Transition pending approval', { itemId: item.id, transitionId: transition.id, approvalId: approval.id });

        const freshItem = await tx.item.findUnique({ where: { id: item.id } });
        return {
          duplicate: false as const,
          transition: transitionRow,
          item: freshItem!,
          approvalId: approval.id,
          status: 'PENDING_APPROVAL' as const,
        };
      }

      const updated = await tx.item.updateMany({
        where: { id: item.id, tenantId: input.tenantId, version: item.version },
        data: {
          currentStateId: transition.toStateId,
          status: transition.toState.isTerminal ? 'APPROVED' : 'ACTIVE',
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        logger.error('[WorkflowEngine] Transition failed: concurrent update failed', { itemId: item.id, version: item.version });
        throw Errors.concurrency();
      }

      const transitionRow = await tx.itemTransition.create({
        data: {
          tenantId: input.tenantId,
          itemId: item.id,
          workflowTransitionId: transition.id,
          fromStateId: item.currentStateId,
          toStateId: transition.toStateId,
          performedById: input.actorUserId,
          idempotencyKey: input.idempotencyKey ?? undefined,
          comment: input.comment,
          metadata: { result: 'COMPLETED' },
        },
      });

      await appendAudit(tx, {
        tenantId: input.tenantId,
        action: 'ITEM_TRANSITIONED',
        actorId: input.actorUserId,
        entityType: 'item',
        entityId: item.id,
        metadata: {
          fromStateId: item.currentStateId,
          toStateId: transition.toStateId,
          transitionId: transition.id,
        },
      });

      logger.info('[WorkflowEngine] Transition executed successfully', { 
        itemId: item.id, 
        transitionId: transition.id, 
        fromStateId: item.currentStateId, 
        toStateId: transition.toStateId,
        terminal: transition.toState.isTerminal
      });

      const freshItem = await tx.item.findUnique({ where: { id: item.id } });
      return {
        duplicate: false as const,
        transition: transitionRow,
        item: freshItem!,
        status: 'COMPLETED' as const,
      };
    });
  } catch (e) {
    if (isUniqueIdempotencyViolation(e) && input.idempotencyKey) {
      const cached = await prisma.itemTransition.findFirst({
        where: { itemId: input.itemId, idempotencyKey: input.idempotencyKey },
        include: { item: true },
      });
      if (cached) {
        return { duplicate: true as const, transition: cached, item: cached.item };
      }
    }
    throw e;
  }
}

async function assertTenantMembers(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userIds: string[],
) {
  const members = await tx.tenantMember.findMany({
    where: { tenantId, userId: { in: userIds } },
    select: { userId: true },
  });
  const found = new Set(members.map((m) => m.userId));
  for (const id of userIds) {
    if (!found.has(id)) {
      throw Errors.validation(`User ${id} is not a member of this tenant`);
    }
  }
}

function isUniqueIdempotencyViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002';
}
