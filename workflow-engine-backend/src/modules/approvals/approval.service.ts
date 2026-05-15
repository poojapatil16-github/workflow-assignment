import type {
  ApprovalMode,
  ApprovalStatus,
  Prisma,
} from '../../prisma.js';
import { prisma } from '../../config/prisma.js';
import { Errors } from '../../common/errors/AppError.js';
import { appendAudit } from '../audit/audit.service.js';
import { logger } from '../../common/logger/logger.js';

export async function canActAsApprover(tenantId: string, userId: string): Promise<boolean> {
  // 1. Check direct role
  const member = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { roles: true },
  });
  if (member?.roles.includes('APPROVER')) {
    return true;
  }

  // 2. Check active delegations
  const delegation = await prisma.delegation.findFirst({
    where: { tenantId, toUserId: userId, active: true },
    select: { id: true },
  });
  return !!delegation;
}

export async function listPendingApprovalsForUser(tenantId: string, userId: string) {
  const delegations = await prisma.delegation.findMany({
    where: { tenantId, toUserId: userId, active: true },
    select: { fromUserId: true },
  });
  const actForUserIds = new Set<string>([userId, ...delegations.map((d) => d.fromUserId)]);

  return prisma.approval.findMany({
    where: {
      tenantId,
      status: 'PENDING',
      item: { status: 'ACTIVE' },
      votes: {
        some: {
          assigneeUserId: { in: [...actForUserIds] },
          decision: null,
        },
      },
    },
    include: {
      item: { include: { currentState: true, workflowVersion: true } },
      workflowTransition: true,
      votes: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveOrReject(params: {
  tenantId: string;
  actorUserId: string;
  approvalId: string;
  decision: 'APPROVE' | 'REJECT';
  comment?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findFirst({
      where: { id: params.approvalId, tenantId: params.tenantId, status: 'PENDING' },
      include: {
        votes: true,
        workflowTransition: true,
        item: true,
      },
    });
    if (!approval) {
      logger.warn('[ApprovalService] Approval not found or not pending', { approvalId: params.approvalId });
      throw Errors.notFound('Approval');
    }
    if (approval.item.status !== 'ACTIVE') {
      logger.warn('[ApprovalService] Cannot act on approval for non-active item', { approvalId: approval.id, itemId: approval.item.id, itemStatus: approval.item.status });
      throw Errors.validation('Cannot approve/reject on a non-active item');
    }

    const canAct = await canActAsApprover(params.tenantId, params.actorUserId);
    if (!canAct) {
      logger.warn('[ApprovalService] Unauthorized approval attempt', { approvalId: approval.id, actorUserId: params.actorUserId });
      throw Errors.forbidden('You are not authorized to act on this approval');
    }

    const slot = await resolveVoteSlot(tx, {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      approval,
    });
    if (!slot) {
      logger.warn('[ApprovalService] No eligible vote slot for user', { approvalId: approval.id, actorUserId: params.actorUserId });
      throw Errors.forbidden('You are not authorized to act on this approval');
    }

    const existing = await tx.approvalVote.findUnique({
      where: {
        approvalId_assigneeUserId: { approvalId: approval.id, assigneeUserId: slot.assigneeUserId },
      },
    });
    if (!existing || existing.decision) {
      throw Errors.duplicateApproval('Vote already recorded for this assignee');
    }

    const delegatedFrom =
      params.actorUserId === slot.assigneeUserId ? null : slot.assigneeUserId;

    await tx.approvalVote.update({
      where: { id: existing.id },
      data: {
        decision: params.decision,
        decidedAt: new Date(),
        comment: params.comment,
        delegatedFromUserId: delegatedFrom,
      },
    });

    logger.info(`[ApprovalService] Vote recorded: ${params.decision}`, { 
      approvalId: approval.id, 
      actorUserId: params.actorUserId, 
      assigneeUserId: slot.assigneeUserId,
      delegated: params.actorUserId !== slot.assigneeUserId
    });

    const freshVotes = await tx.approvalVote.findMany({ where: { approvalId: approval.id } });
    const decision = evaluateApprovalOutcome(approval.mode, approval.quorumRequired, freshVotes);

    if (decision === 'PENDING') {
      return { approvalId: approval.id, status: 'PENDING' as const };
    }

    const newApprovalStatus: ApprovalStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    await tx.approval.update({
      where: { id: approval.id },
      data: { status: newApprovalStatus, resolvedAt: new Date() },
    });

    if (decision === 'REJECTED') {
      await tx.item.update({
        where: { id: approval.item.id },
        data: { status: 'REJECTED' },
      });

      await appendAudit(tx, {
        tenantId: params.tenantId,
        action: 'APPROVAL_REJECTED',
        actorId: params.actorUserId,
        entityType: 'approval',
        entityId: approval.id,
        metadata: { final: true },
      });
      
      logger.info('[ApprovalService] Approval rejected - Workflow Terminated', { approvalId: approval.id, itemId: approval.item.id });
      return { approvalId: approval.id, status: 'REJECTED' as const };
    }

    // APPROVED: apply transition
    const item = approval.item;
    const transition = approval.workflowTransition;

    const toState = await tx.workflowState.findUnique({
      where: { id: transition.toStateId },
    });

    const updated = await tx.item.updateMany({
      where: { id: item.id, tenantId: params.tenantId, version: item.version },
      data: {
        currentStateId: transition.toStateId,
        status: toState?.isTerminal ? 'APPROVED' : 'ACTIVE',
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      logger.error('[ApprovalService] Transition failed after approval: concurrency version mismatch', { itemId: item.id, version: item.version });
      await tx.approval.update({
        where: { id: approval.id },
        data: { status: 'PENDING', resolvedAt: null },
      });
      await tx.approvalVote.update({
        where: { id: existing.id },
        data: { decision: null, decidedAt: null, comment: null, delegatedFromUserId: null },
      });
      throw Errors.concurrency('Item changed while approval was processed; please retry');
    }

    await tx.itemTransition.create({
      data: {
        tenantId: params.tenantId,
        itemId: item.id,
        workflowTransitionId: transition.id,
        fromStateId: item.currentStateId,
        toStateId: transition.toStateId,
        performedById: params.actorUserId,
        metadata: { viaApprovalId: approval.id },
      },
    });

    await appendAudit(tx, {
      tenantId: params.tenantId,
      action: 'APPROVAL_APPROVED',
      actorId: params.actorUserId,
      entityType: 'approval',
      entityId: approval.id,
      metadata: { final: true },
    });
    await appendAudit(tx, {
      tenantId: params.tenantId,
      action: 'ITEM_TRANSITIONED',
      actorId: params.actorUserId,
      entityType: 'item',
      entityId: item.id,
      metadata: {
        fromStateId: item.currentStateId,
        toStateId: transition.toStateId,
        transitionId: transition.id,
        viaApprovalId: approval.id,
      },
    });

    logger.info('[ApprovalService] Approval approved - Transition executed', { approvalId: approval.id, itemId: item.id, toStateId: transition.toStateId });

    const nextItem = await tx.item.findUnique({ where: { id: item.id } });
    return { approvalId: approval.id, status: 'APPROVED' as const, item: nextItem };
  });
}

async function resolveVoteSlot(
  tx: Prisma.TransactionClient,
  input: { tenantId: string; actorUserId: string; approval: { votes: { assigneeUserId: string }[] } },
): Promise<{ assigneeUserId: string } | null> {
  // Check if original approver has delegated. If so, they should NOT be able to approve.
  for (const v of input.approval.votes) {
    const delegation = await tx.delegation.findFirst({
      where: {
        tenantId: input.tenantId,
        fromUserId: v.assigneeUserId,
        active: true,
      },
    });

    if (delegation) {
      // If original approver (v.assigneeUserId) is the actor, but they have an active delegation
      if (v.assigneeUserId === input.actorUserId) {
        // Original approver loses authority after delegation
        return null;
      }
      // If actor is the delegated user
      if (delegation.toUserId === input.actorUserId) {
        return { assigneeUserId: v.assigneeUserId };
      }
    } else {
      // No active delegation, original approver can act
      if (v.assigneeUserId === input.actorUserId) {
        return { assigneeUserId: v.assigneeUserId };
      }
    }
  }
  return null;
}

function evaluateApprovalOutcome(
  mode: ApprovalMode,
  quorumRequired: number | null,
  votes: { decision: 'APPROVE' | 'REJECT' | null }[],
): 'APPROVED' | 'REJECTED' | 'PENDING' {
  const decided = votes.filter((v) => v.decision);
  if (decided.some((v) => v.decision === 'REJECT')) return 'REJECTED';
  const approves = decided.filter((v) => v.decision === 'APPROVE').length;
  if (mode === 'SINGLE') {
    return approves >= 1 ? 'APPROVED' : 'PENDING';
  }
  if (mode === 'ALL') {
    const allApproved = votes.length > 0 && votes.every((v) => v.decision === 'APPROVE');
    return allApproved ? 'APPROVED' : 'PENDING';
  }
  const quorum = quorumRequired ?? 1;
  return approves >= quorum ? 'APPROVED' : 'PENDING';
}
