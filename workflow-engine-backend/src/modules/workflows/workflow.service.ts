import type {
  Prisma,
  WorkflowState,
  WorkflowTransition,
  WorkflowVersion,
} from '../../prisma.js';
import { prisma } from '../../config/prisma.js';
import { Errors } from '../../common/errors/AppError.js';
import { appendAudit } from '../audit/audit.service.js';
import type { workflowDefinitionSchema } from './workflow.validator.js';
import type { z } from 'zod';

type Definition = z.infer<typeof workflowDefinitionSchema>;

export async function createWorkflow(
  tenantId: string,
  actorId: string,
  input: { name: string; description?: string; definition: Definition },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.workflow.findFirst({
      where: { tenantId, name: input.name },
    });
    if (existing) {
      throw Errors.conflict('Workflow name already exists in tenant');
    }
    const wf = await tx.workflow.create({
      data: { tenantId, name: input.name, description: input.description },
    });
    const version = await createVersionGraph(tx, wf.id, 1, input.definition);
    await appendAudit(tx, {
      tenantId,
      action: 'WORKFLOW_CREATED',
      actorId,
      entityType: 'workflow',
      entityId: wf.id,
      metadata: { name: wf.name },
    });
    await appendAudit(tx, {
      tenantId,
      action: 'WORKFLOW_VERSION_CREATED',
      actorId,
      entityType: 'workflow_version',
      entityId: version.id,
      metadata: { workflowId: wf.id, version: 1 },
    });
    return { workflow: wf, version };
  });
}

export async function listWorkflows(
  tenantId: string,
  query: { page: number; limit: number; search?: string; sortBy: string; sortOrder: 'asc' | 'desc' },
) {
  const where = {
    tenantId,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { description: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const orderBy =
    query.sortBy === 'name'
      ? { name: query.sortOrder }
      : { createdAt: query.sortOrder };
  const [total, rows] = await prisma.$transaction([
    prisma.workflow.count({ where }),
    prisma.workflow.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, version: true, status: true, publishedAt: true },
        },
      },
    }),
  ]);
  return { rows, total };
}

export async function getWorkflow(tenantId: string, workflowId: string) {
  const wf = await prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        include: {
          states: true,
          transitions: { include: { fromState: true, toState: true } },
        },
      },
    },
  });
  if (!wf) throw Errors.notFound('Workflow');
  return wf;
}

export async function createDraftVersion(
  tenantId: string,
  workflowId: string,
  actorId: string,
  body: { definition?: Definition },
) {
  const wf = await prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: { states: true, transitions: true },
      },
    },
  });
  if (!wf || wf.versions.length === 0) throw Errors.notFound('Workflow');
  const latest = wf.versions[0];
  const nextVersion = latest.version + 1;
  const definition = body.definition ?? graphToDefinition(latest);
  return prisma.$transaction(async (tx) => {
    const version = await createVersionGraph(tx, workflowId, nextVersion, definition);
    await appendAudit(tx, {
      tenantId,
      action: 'WORKFLOW_VERSION_CREATED',
      actorId,
      entityType: 'workflow_version',
      entityId: version.id,
      metadata: { workflowId, version: nextVersion },
    });
    return version;
  });
}

export async function publishWorkflowVersion(
  tenantId: string,
  workflowId: string,
  versionId: string,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const wf = await tx.workflow.findFirst({
      where: { id: workflowId, tenantId },
    });
    if (!wf) throw Errors.notFound('Workflow');
    const ver = await tx.workflowVersion.findFirst({
      where: { id: versionId, workflowId },
    });
    if (!ver) throw Errors.notFound('Workflow version');
    if (ver.status === 'PUBLISHED') {
      throw Errors.conflict('Version already published');
    }
    await assertValidWorkflowGraph(tx, ver.id);
    await tx.workflowVersion.updateMany({
      where: { workflowId, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    });
    const published = await tx.workflowVersion.update({
      where: { id: ver.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await appendAudit(tx, {
      tenantId,
      action: 'WORKFLOW_PUBLISHED',
      actorId,
      entityType: 'workflow_version',
      entityId: published.id,
      metadata: { workflowId, version: published.version },
    });
    return published;
  });
}

async function createVersionGraph(
  tx: Prisma.TransactionClient,
  workflowId: string,
  versionNumber: number,
  definition: Definition,
) {
  const wfVersion = await tx.workflowVersion.create({
    data: { workflowId, version: versionNumber, status: 'DRAFT' },
  });
  const nameToStateId = new Map<string, string>();
  for (const s of definition.states) {
    const row = await tx.workflowState.create({
      data: {
        workflowVersionId: wfVersion.id,
        name: s.name,
        isInitial: s.isInitial,
        metadata: (s.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
    nameToStateId.set(s.name, row.id);
  }
  for (const t of definition.transitions) {
    await tx.workflowTransition.create({
      data: {
        workflowVersionId: wfVersion.id,
        fromStateId: nameToStateId.get(t.fromStateName)!,
        toStateId: nameToStateId.get(t.toStateName)!,
        name: t.name,
        requiresApproval: t.requiresApproval,
        approvalMode: t.requiresApproval ? t.approvalMode ?? null : null,
        quorumCount:
          t.requiresApproval && t.approvalMode === 'QUORUM' ? t.quorumCount ?? null : null,
        approverUserIds: t.approverUserIds as Prisma.InputJsonValue,
        validationRules: (t.validationRules as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  }
  return wfVersion;
}

function graphToDefinition(
  version: WorkflowVersion & { states: WorkflowState[]; transitions: WorkflowTransition[] },
): Definition {
  const idToName = new Map(version.states.map((s) => [s.id, s.name]));
  return {
    states: version.states.map((s) => ({
      name: s.name,
      isInitial: s.isInitial,
      metadata: (s.metadata as Record<string, unknown> | null) ?? undefined,
    })),
    transitions: version.transitions.map((t) => ({
      name: t.name,
      fromStateName: idToName.get(t.fromStateId)!,
      toStateName: idToName.get(t.toStateId)!,
      requiresApproval: t.requiresApproval,
      approvalMode: t.approvalMode ?? undefined,
      quorumCount: t.quorumCount ?? undefined,
      approverUserIds: (t.approverUserIds as string[]) ?? [],
      validationRules: (t.validationRules as Record<string, unknown> | null) ?? undefined,
    })),
  };
}

async function assertValidWorkflowGraph(tx: Prisma.TransactionClient, versionId: string) {
  const states = await tx.workflowState.findMany({ where: { workflowVersionId: versionId } });
  const transitions = await tx.workflowTransition.findMany({
    where: { workflowVersionId: versionId },
  });
  const initial = states.filter((s) => s.isInitial);
  if (initial.length !== 1) {
    throw Errors.workflowInvalid('Exactly one initial state is required');
  }
  const names = new Set(states.map((s) => s.name));
  if (names.size !== states.length) {
    throw Errors.workflowInvalid('Duplicate state names');
  }
  const stateIds = new Set(states.map((s) => s.id));
  for (const t of transitions) {
    if (!stateIds.has(t.fromStateId) || !stateIds.has(t.toStateId)) {
      throw Errors.workflowInvalid(`Invalid transition endpoints for ${t.name}`);
    }
    if (t.requiresApproval) {
      if (!t.approvalMode) {
        throw Errors.workflowInvalid(`approvalMode missing for ${t.name}`);
      }
      if (t.approvalMode === 'QUORUM' && (!t.quorumCount || t.quorumCount < 1)) {
        throw Errors.workflowInvalid(`quorumCount invalid for ${t.name}`);
      }
      const approvers = t.approverUserIds as unknown;
      if (!Array.isArray(approvers) || approvers.length === 0) {
        throw Errors.workflowInvalid(`approverUserIds required for ${t.name}`);
      }
    }
  }
}
