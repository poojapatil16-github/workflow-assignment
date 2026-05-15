import { z } from 'zod';

/** Matches Prisma `ApprovalMode` and `src/modules/workflows/workflow.validator.ts`. */
export const approvalModeSchema = z.enum(['SINGLE', 'ALL', 'QUORUM']);
export type ApprovalMode = z.infer<typeof approvalModeSchema>;

export const APPROVAL_MODE_OPTIONS: { value: ApprovalMode; label: string; description: string }[] = [
  { value: 'SINGLE', label: 'Single', description: 'One approver is enough' },
  { value: 'ALL', label: 'All', description: 'Every listed approver must approve' },
  { value: 'QUORUM', label: 'Quorum', description: 'Minimum approvals using quorumCount' },
];

const stateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(64),
  isInitial: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const transitionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(64),
  fromStateId: z.string().uuid().optional(),
  toStateId: z.string().uuid().optional(),
  fromStateName: z.string().min(1).max(64).optional(),
  toStateName: z.string().min(1).max(64).optional(),
  requiresApproval: z.boolean().default(false),
  /** Required on every transition in payloads (backend stores null when requiresApproval is false). */
  approvalMode: approvalModeSchema,
  quorumCount: z.coerce.number().int().min(1).optional(),
  approverUserIds: z.array(z.string().uuid()).default([]),
  validationRules: z.record(z.string(), z.unknown()).optional(),
});

/** Mirrors backend definition + approval rules (`workflow.validator.ts`, `assertValidWorkflowGraph`). */
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

    const stateIds = new Set<string>();
    const names = new Set<string>();
    for (const s of def.states) {
      if (s.id) {
        if (stateIds.has(s.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate state ID: ${s.id}`,
          });
        }
        stateIds.add(s.id);
      }
      if (names.has(s.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate state name: ${s.name}`,
        });
      }
      names.add(s.name);
    }

    const transitionKeys = new Set<string>();
    for (let ti = 0; ti < def.transitions.length; ti++) {
      const t = def.transitions[ti];
      const fromRef = t.fromStateId || t.fromStateName;
      const toRef = t.toStateId || t.toStateName;

      if (t.fromStateId) {
        if (!stateIds.has(t.fromStateId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown fromStateId: ${t.fromStateId}`,
            path: ['transitions', ti, 'fromStateId'],
          });
        }
      } else if (t.fromStateName) {
        if (!names.has(t.fromStateName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown fromStateName: ${t.fromStateName}`,
            path: ['transitions', ti, 'fromStateName'],
          });
        }
      }

      if (t.toStateId) {
        if (!stateIds.has(t.toStateId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown toStateId: ${t.toStateId}`,
            path: ['transitions', ti, 'toStateId'],
          });
        }
      } else if (t.toStateName) {
        if (!names.has(t.toStateName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown toStateName: ${t.toStateName}`,
            path: ['transitions', ti, 'toStateName'],
          });
        }
      }

      const triple = `${fromRef}|${toRef}|${t.name}`;
      if (transitionKeys.has(triple)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate transition "${t.name}" between ${t.fromStateName} and ${t.toStateName}`,
          path: ['transitions', ti],
        });
      }
      transitionKeys.add(triple);

      if (t.requiresApproval) {
        if (t.approvalMode === 'QUORUM' && (!t.quorumCount || t.quorumCount < 1)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `quorumCount required (≥ 1) for QUORUM on transition "${t.name}"`,
            path: ['transitions', ti, 'quorumCount'],
          });
        }
        if (!t.approverUserIds?.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `approverUserIds required when approval is enabled on "${t.name}"`,
            path: ['transitions', ti, 'approverUserIds'],
          });
        }
      }
    }
  });

export const createWorkflowFormSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  definition: workflowDefinitionSchema,
});
export type CreateWorkflowForm = z.infer<typeof createWorkflowFormSchema>;
