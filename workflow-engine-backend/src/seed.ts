import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { createPrismaClient } from './prisma.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to run the seed script');
}

const prisma = createPrismaClient({
  databaseUrl: process.env.DATABASE_URL,
  accelerateUrl: process.env.PRISMA_ACCELERATE_URL,
  nodeEnv: process.env.NODE_ENV ?? 'development',
});

function isIdempotentSeedError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P2002', 'P2003', 'P2025'].includes(error.code);
  }

  return false;
}

async function main() {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);

  // =========================
  // ADMIN USER
  // =========================
  const admin = await prisma.user.upsert({
    where: { email: 'admin@workflow.com' },
    update: {
      globalRole: 'ADMIN',
      name: 'Workflow Admin',
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@workflow.com',
      name: 'Workflow Admin',
      passwordHash: await bcrypt.hash('Pass@321', rounds),
      globalRole: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // =========================
  // CREATOR USER
  // =========================
  const creatorUser = await prisma.user.upsert({
    where: { email: 'creater@workflow.com' },
    update: {
      globalRole: 'USER',
      name: 'Workflow Creator',
      status: 'ACTIVE',
    },
    create: {
      email: 'creater@workflow.com',
      name: 'Workflow Creator',
      passwordHash: await bcrypt.hash('Pass@321', rounds),
      globalRole: 'USER',
      status: 'ACTIVE',
    },
  });

  // =========================
  // APPROVER USER
  // =========================
  const approverUser = await prisma.user.upsert({
    where: { email: 'approver@workflow.com' },
    update: {
      globalRole: 'USER',
      name: 'Workflow Approver',
      status: 'ACTIVE',
    },
    create: {
      email: 'approver@workflow.com',
      name: 'Workflow Approver',
      passwordHash: await bcrypt.hash('Pass@321', rounds),
      globalRole: 'USER',
      status: 'ACTIVE',
    },
  });

  // =========================
  // TENANT
  // =========================
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'amer-center' },
    update: {
      name: 'Amer Center',
    },
    create: {
      name: 'Amer Center',
      slug: 'amer-center',
    },
  });

  // =========================
  // TENANT MEMBERS
  // =========================

  // Creator Member
  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: creatorUser.id,
      },
    },
    update: {
      roles: ['CREATOR'],
    },
    create: {
      tenantId: tenant.id,
      userId: creatorUser.id,
      roles: ['CREATOR'],
    },
  });

  // Approver Member
  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: approverUser.id,
      },
    },
    update: {
      roles: ['APPROVER'],
    },
    create: {
      tenantId: tenant.id,
      userId: approverUser.id,
      roles: ['APPROVER'],
    },
  });

  // Optional: Admin also inside tenant
  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: admin.id,
      },
    },
    update: {
      roles: ['CREATOR', 'APPROVER'],
    },
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      roles: ['CREATOR', 'APPROVER'],
    },
  });

  // =========================
  // WORKFLOW
  // =========================
  const existingWorkflow = await prisma.workflow.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Dubai Visa Process',
    },
  });

  if (!existingWorkflow) {
    const workflow = await prisma.workflow.create({
      data: {
        tenantId: tenant.id,
        name: 'Dubai Visa Process',
        description: 'Dubai Visa Approval Workflow',
      },
    });

    // =========================
    // WORKFLOW VERSION
    // =========================
    const version = await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        status: 'DRAFT',
      },
    });

    // =========================
    // STATES
    // =========================
    const draftState = await prisma.workflowState.create({
      data: {
        workflowVersionId: version.id,
        name: 'draft',
        isInitial: true,
      },
    });

    const reviewState = await prisma.workflowState.create({
      data: {
        workflowVersionId: version.id,
        name: 'review',
        isInitial: false,
      },
    });

    const approvedState = await prisma.workflowState.create({
      data: {
        workflowVersionId: version.id,
        name: 'approved',
        isInitial: false,
      },
    });

    // =========================
    // TRANSITIONS
    // =========================

    // Draft -> Review
    const submitTransition = await prisma.workflowTransition.create({
      data: {
        workflowVersionId: version.id,
        fromStateId: draftState.id,
        toStateId: reviewState.id,
        name: 'submit_for_review',
        requiresApproval: true,
        approvalMode: 'SINGLE',
        approverUserIds: [approverUser.id],
        quorumCount: null,
      },
    });

    // Review -> Approved
    await prisma.workflowTransition.create({
      data: {
        workflowVersionId: version.id,
        fromStateId: reviewState.id,
        toStateId: approvedState.id,
        name: 'approve',
        requiresApproval: false,
        approverUserIds: [],
      },
    });

    // =========================
    // PUBLISH WORKFLOW
    // =========================
    await prisma.workflowVersion.update({
      where: { id: version.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // =========================
    // CREATE ITEM BY CREATOR
    // =========================
    const visaItem = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        workflowId: workflow.id,
        workflowVersionId: version.id,
        currentStateId: draftState.id,
        title: 'Dubai Employment Visa Request',
        createdById: creatorUser.id,
        version: 1,
      },
    });

    // =========================
    // CREATE APPROVAL
    // =========================
    const approval = await prisma.approval.create({
      data: {
        tenantId: tenant.id,
        itemId: visaItem.id,
        workflowTransitionId: submitTransition.id,
        mode: 'SINGLE',
        quorumRequired: null,
      },
    });

    // Assign Approver
    await prisma.approvalVote.create({
      data: {
        approvalId: approval.id,
        assigneeUserId: approverUser.id,
      },
    });

    // Item Transition
    await prisma.itemTransition.create({
      data: {
        tenantId: tenant.id,
        itemId: visaItem.id,
        workflowTransitionId: submitTransition.id,
        fromStateId: draftState.id,
        toStateId: null,
        performedById: creatorUser.id,
        idempotencyKey: 'seed-dubai-visa-submit',
        metadata: {
          pendingApprovalId: approval.id,
          result: 'PENDING_APPROVAL',
        },
      },
    });

    // =========================
    // SLA RULE
    // =========================
    await prisma.slaRule.create({
      data: {
        tenantId: tenant.id,
        workflowVersionId: version.id,
        workflowStateId: reviewState.id,
        name: 'Visa Review SLA',
        durationMinutes: 240,
        escalateToUserId: admin.id,
        enabled: true,
      },
    });
  }

  console.log('Seed complete', {
    tenant: tenant.name,
    admin: admin.email,
    creator: creatorUser.email,
    approver: approverUser.email,
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    if (isIdempotentSeedError(error)) {
      console.warn(
        '[seed] Skipping non-fatal conflict:',
        error
      );
      await prisma.$disconnect();
      return;
    }

    console.error('[seed] Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });