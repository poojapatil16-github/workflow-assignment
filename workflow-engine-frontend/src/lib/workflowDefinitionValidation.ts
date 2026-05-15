import { workflowDefinitionSchema } from '@/types/workflow-definition';
import type { WorkflowGraphDefinition } from '@/types/workflow-graph';

export type ValidationResult =
  | { ok: true; definition: WorkflowGraphDefinition }
  | { ok: false; errors: string[] };

/** Parse and validate against the same rules as the backend workflow definition schema. */
export function validateWorkflowDefinition(input: unknown): ValidationResult {
  const parsed = workflowDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) =>
      i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message,
    );
    return { ok: false, errors };
  }

  return { ok: true, definition: parsed.data };
}

/** JSON for editor / API: omit quorumCount unless mode is QUORUM (backend field name `quorumCount`). */
export function stringifyDefinition(def: WorkflowGraphDefinition): string {
  const stateIdToName = new Map(def.states.map((s) => [s.id, s.name]));

  const out = {
    states: def.states.map((s) => ({
      name: s.name,
      isInitial: s.isInitial,
      ...(s.metadata != null ? { metadata: s.metadata } : {}),
    })),
    transitions: def.transitions.map((t) => {
      const fromName = t.fromStateName ?? (t.fromStateId ? stateIdToName.get(t.fromStateId) : undefined);
      const toName = t.toStateName ?? (t.toStateId ? stateIdToName.get(t.toStateId) : undefined);

      return {
        name: t.name,
        fromStateName: fromName,
        toStateName: toName,
        requiresApproval: t.requiresApproval,
        approvalMode: t.approvalMode,
        approverUserIds: t.approverUserIds,
        ...(t.approvalMode === 'QUORUM' && t.quorumCount != null ? { quorumCount: t.quorumCount } : {}),
        ...(t.validationRules != null ? { validationRules: t.validationRules } : {}),
      };
    }),
  };
  return JSON.stringify(out, null, 2);
}
