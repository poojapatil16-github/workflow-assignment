import type { Prisma } from '../../prisma.js';
import { prisma } from '../../config/prisma.js';
import { Errors } from '../../common/errors/AppError.js';
import { appendAudit } from '../audit/audit.service.js';
import { logger } from '../../common/logger/logger.js';

export async function findActiveDelegation(params: {
  tenantId: string;
  fromUserId: string;
  toUserId: string;
  tx?: Prisma.TransactionClient;
}): Promise<{ id: string } | null> {
  const client = params.tx ?? prisma;
  return client.delegation.findFirst({
    where: {
      tenantId: params.tenantId,
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      active: true,
    },
    select: { id: true },
  });
}

export async function createDelegation(
  input: {
    tenantId: string;
    fromUserId: string;
    toUserId: string;
    metadata?: Prisma.InputJsonValue;
  },
  tx: Prisma.TransactionClient,
) {
  return tx.delegation.create({
    data: {
      tenantId: input.tenantId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      active: true,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function listDelegations(tenantId: string) {
  return prisma.delegation.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      fromUser: { select: { id: true, email: true, name: true } },
      toUser: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function createDelegationWithAudit(input: {
  tenantId: string;
  actorId: string;
  fromUserId: string;
  toUserId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  if (input.fromUserId === input.toUserId) {
    throw Errors.validation('Cannot delegate to the same user');
  }
  return prisma.$transaction(async (tx) => {
    // Check if delegation already exists
    const existing = await tx.delegation.findFirst({
      where: {
        tenantId: input.tenantId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        active: true,
      },
    });
    if (existing) {
      logger.warn('[DelegationService] Delegation creation failed: duplicate exists', { fromUserId: input.fromUserId, toUserId: input.toUserId });
      throw Errors.validation('Duplicate delegation already exists');
    }

    // Verify toUserId is eligible (CREATOR role)
    const toMember = await tx.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: input.tenantId, userId: input.toUserId } },
    });
    if (!toMember || !toMember.roles.includes('CREATOR')) {
      logger.warn('[DelegationService] Delegation creation failed: target ineligible', { toUserId: input.toUserId });
      throw Errors.validation('Delegation target must be an eligible user (CREATOR)');
    }

    const row = await createDelegation(
      {
        tenantId: input.tenantId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        metadata: input.metadata,
      },
      tx,
    );
    await appendAudit(tx, {
      tenantId: input.tenantId,
      action: 'DELEGATION_CREATED',
      actorId: input.actorId,
      entityType: 'delegation',
      entityId: row.id,
      metadata: { fromUserId: input.fromUserId, toUserId: input.toUserId },
    });
    logger.info('[DelegationService] Delegation created', { delegationId: row.id, fromUserId: input.fromUserId, toUserId: input.toUserId });
    return row;
  });
}

export async function revokeDelegation(tenantId: string, actorId: string, delegationId: string) {
  return prisma.$transaction(async (tx) => {
    const delegation = await tx.delegation.findFirst({
      where: { id: delegationId, tenantId },
    });
    if (!delegation) {
      logger.warn('[DelegationService] Delegation not found for revocation', { delegationId });
      throw Errors.notFound('Delegation');
    }

    const updated = await tx.delegation.update({
      where: { id: delegationId },
      data: { active: false },
    });

    await appendAudit(tx, {
      tenantId,
      action: 'DELEGATION_CREATED', // Using CREATED for simplicity or can add REVOKED if enum supports it
      actorId,
      entityType: 'delegation',
      entityId: delegationId,
      metadata: { revoked: true },
    });
    logger.info('[DelegationService] Delegation revoked', { delegationId, fromUserId: delegation.fromUserId, toUserId: delegation.toUserId });
    return updated;
  });
}
