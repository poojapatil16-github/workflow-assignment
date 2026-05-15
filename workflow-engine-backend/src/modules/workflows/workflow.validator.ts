import { z } from 'zod';

const approvalModeSchema = z.enum(['SINGLE', 'ALL', 'QUORUM']);

const stateSchema = z.object({
  name: z.string().min(1).max(64),
  isInitial: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const transitionSchema = z.object({
  name: z.string().min(1).max(64),
  fromStateName: z.string().min(1).max(64),
  toStateName: z.string().min(1).max(64),
  requiresApproval: z.boolean().default(false),
  approvalMode: approvalModeSchema.optional(),
  quorumCount: z.coerce.number().int().min(1).optional(),
  approverUserIds: z.array(z.string().uuid()).default([]),
  validationRules: z.record(z.string(), z.unknown()).optional(),
});

export const workflowDefinitionSchema = z
  .object({
    states: z.array(stateSchema).min(1),
    transitions: z.array(transitionSchema).default([]),
  })
  .superRefine((def, ctx) => {
    const initial = def.states.filter((s) => s.isInitial);
    if (initial.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Workflow must have exactly one initial state',
      });
    }
    const names = new Set<string>();
    for (const s of def.states) {
      if (names.has(s.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate state name: ${s.name}`,
        });
      }
      names.add(s.name);
    }
    for (const t of def.transitions) {
      if (!names.has(t.fromStateName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown fromStateName: ${t.fromStateName}`,
        });
      }
      if (!names.has(t.toStateName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown toStateName: ${t.toStateName}`,
        });
      }
      if (t.requiresApproval) {
        if (!t.approvalMode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `approvalMode required for transition ${t.name}`,
          });
        }
        if (t.approvalMode === 'QUORUM' && (!t.quorumCount || t.quorumCount < 1)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `quorumCount required for QUORUM on ${t.name}`,
          });
        }
        if (!t.approverUserIds?.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `approverUserIds required for approval on ${t.name}`,
          });
        }
      }
    }
  });

export const createWorkflowBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  definition: workflowDefinitionSchema,
});

export const newWorkflowVersionBodySchema = z.object({
  definition: workflowDefinitionSchema.optional(),
});

export const listWorkflowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const publishWorkflowBodySchema = z.object({
  versionId: z.string().uuid(),
});
