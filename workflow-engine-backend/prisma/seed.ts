import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createPrismaClient } from '../src/prisma.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to run the seed script');
}

const prisma = createPrismaClient({
  databaseUrl: process.env.DATABASE_URL,
  accelerateUrl: process.env.PRISMA_ACCELERATE_URL,
  nodeEnv: process.env.NODE_ENV ?? 'development',
});

async function main() {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@workflow.com' },
    update: { globalRole: 'ADMIN', name: 'Workflow Admin', status: 'ACTIVE' },
    create: {
      email: 'admin@workflow.com',
      name: 'Acme Admin',
      passwordHash: await bcrypt.hash('Admin123!Admin123!', rounds),
      globalRole: 'ADMIN',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@workflow.com' },
    update: { globalRole: 'USER', name: 'Workflow User', status: 'ACTIVE' },
    create: {
      email: 'user@workflow.com',
      name: 'Acme User',
      passwordHash: await bcrypt.hash('User123!User123!', rounds),
      globalRole: 'USER',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Corporation', slug: 'acme' },
  });

  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
    update: { roles: ['CREATOR', 'APPROVER'] },
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      roles: ['CREATOR', 'APPROVER'],
    },
  });

  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { roles: ['CREATOR'] },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      roles: ['CREATOR'],
    },
  });

  const existingWf = await prisma.workflow.findFirst({
    where: { tenantId: tenant.id, name: 'Document Lifecycle' },
  });
  if (!existingWf) {
    const workflow = await prisma.workflow.create({
      data: {
        tenantId: tenant.id,
        name: 'Document Lifecycle',
        description: 'Draft → Review → Approved',
      },
    });

    const v1 = await prisma.workflowVersion.create({
      data: { workflowId: workflow.id, version: 1, status: 'DRAFT' },
    });

    const draft = await prisma.workflowState.create({
      data: { workflowVersionId: v1.id, name: 'draft', isInitial: true },
    });
    const review = await prisma.workflowState.create({
      data: { workflowVersionId: v1.id, name: 'review', isInitial: false },
    });
    const approved = await prisma.workflowState.create({
      data: { workflowVersionId: v1.id, name: 'approved', isInitial: false },
    });

    await prisma.workflowTransition.create({
      data: {
        workflowVersionId: v1.id,
        fromStateId: draft.id,
        toStateId: review.id,
        name: 'submit_for_review',
        requiresApproval: true,
        approvalMode: 'SINGLE',
        approverUserIds: [admin.id],
        quorumCount: null,
      },
    });

    await prisma.workflowTransition.create({
      data: {
        workflowVersionId: v1.id,
        fromStateId: review.id,
        toStateId: approved.id,
        name: 'approve_final',
        requiresApproval: false,
        approverUserIds: [],
      },
    });

    await prisma.workflowVersion.update({
      where: { id: v1.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    const item1 = await prisma.item.create({
      data: {
        tenantId: tenant.id,
        workflowId: workflow.id,
        workflowVersionId: v1.id,
        currentStateId: draft.id,
        title: 'Q1 Policy Draft',
        createdById: user.id,
        version: 1,
      },
    });

    const submit = await prisma.workflowTransition.findFirstOrThrow({
      where: { workflowVersionId: v1.id, name: 'submit_for_review' },
    });

    const approval = await prisma.approval.create({
      data: {
        tenantId: tenant.id,
        itemId: item1.id,
        workflowTransitionId: submit.id,
        mode: 'SINGLE',
        quorumRequired: null,
      },
    });

    await prisma.approvalVote.create({
      data: { approvalId: approval.id, assigneeUserId: admin.id },
    });

    await prisma.itemTransition.create({
      data: {
        tenantId: tenant.id,
        itemId: item1.id,
        workflowTransitionId: submit.id,
        fromStateId: draft.id,
        toStateId: null,
        performedById: user.id,
        idempotencyKey: 'seed-submit-once',
        metadata: { pendingApprovalId: approval.id, result: 'PENDING_APPROVAL' },
      },
    });

    await prisma.item.create({
      data: {
        tenantId: tenant.id,
        workflowId: workflow.id,
        workflowVersionId: v1.id,
        currentStateId: draft.id,
        title: 'HR Handbook Draft',
        createdById: admin.id,
        version: 1,
      },
    });

    await prisma.slaRule.create({
      data: {
        tenantId: tenant.id,
        workflowVersionId: v1.id,
        workflowStateId: draft.id,
        name: 'Draft response SLA',
        durationMinutes: 240,
        escalateToUserId: admin.id,
        enabled: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete', { tenant: tenant.slug, admin: admin.email, user: user.email });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
