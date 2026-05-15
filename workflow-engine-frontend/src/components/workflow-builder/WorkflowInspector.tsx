import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import type { UserDirectoryRow } from '@/api/users';
import { APPROVAL_MODE_OPTIONS, type ApprovalMode } from '@/types/workflow-definition';
import { useWorkflowBuilderStore } from '@/store/workflowBuilderStore';

type Props = {
  tenantUsers: UserDirectoryRow[] | undefined;
};

export function WorkflowInspector({ tenantUsers }: Props) {
  const definition = useWorkflowBuilderStore((s) => s.definition);
  const selection = useWorkflowBuilderStore((s) => s.selection);
  const updateState = useWorkflowBuilderStore((s) => s.updateState);
  const removeState = useWorkflowBuilderStore((s) => s.removeState);
  const updateTransition = useWorkflowBuilderStore((s) => s.updateTransition);
  const removeTransition = useWorkflowBuilderStore((s) => s.removeTransition);

  if (!selection) {
    return (
      <div className="rounded-md border border-dashed border-border-tertiary bg-bg-secondary/50 px-3 py-3 text-xs text-fg-secondary">
        Select a state or transition on the canvas, or connect two states to create a transition.
      </div>
    );
  }

  if (selection.kind === 'state') {
    const st = definition.states.find((s) => s.id === selection.stateId);
    if (!st) return null;
    return (
      <div className="ds-stack gap-3 rounded-md border border-border-secondary bg-bg-secondary px-3 py-3 text-sm">
        <div className="font-semibold text-fg-primary">Edit state</div>
        <label className="ds-stack gap-1">
          <span className="text-xs text-fg-secondary">Name</span>
          <Input
            value={st.name}
            onChange={(e) =>
              updateState(selection.stateId, { name: e.target.value, isInitial: st.isInitial })
            }
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-fg-secondary">
          <input
            type="checkbox"
            checked={st.isInitial}
            onChange={(e) =>
              updateState(selection.stateId, { name: st.name, isInitial: e.target.checked })
            }
          />
          Initial state
        </label>
        <Button type="button" variant="danger" className="w-fit text-xs" onClick={() => removeState(st.id!)}>
          Delete state
        </Button>
        <p className="text-[11px] text-fg-tertiary">
          Removing a state deletes related transitions. At least one state stays marked initial.
        </p>
      </div>
    );
  }

  const tr = definition.transitions.find((t) => t.id === selection.id);
  if (!tr) return null;

  const toggleApprover = (userId: string) => {
    const set = new Set(tr.approverUserIds);
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    updateTransition(tr.id!, { approverUserIds: [...set] });
  };

  const onApprovalModeChange = (mode: ApprovalMode) => {
    updateTransition(tr.id!, {
      approvalMode: mode,
      quorumCount: mode === 'QUORUM' ? tr.quorumCount ?? 1 : undefined,
    });
  };

  return (
    <div className="ds-stack gap-3 rounded-md border border-border-secondary bg-bg-secondary px-3 py-3 text-sm">
      <div className="font-semibold text-fg-primary">Edit transition</div>
      
      <div className="grid grid-cols-2 gap-2">
        <label className="ds-stack gap-1">
          <span className="text-[11px] text-fg-secondary uppercase font-medium">From</span>
          <select
            className="rounded-md border border-border-secondary bg-bg-secondary px-2 py-1.5 text-xs text-fg-primary"
            value={tr.fromStateId}
            onChange={(e) => updateTransition(tr.id!, { fromStateId: e.target.value })}
          >
            {definition.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ds-stack gap-1">
          <span className="text-[11px] text-fg-secondary uppercase font-medium">To</span>
          <select
            className="rounded-md border border-border-secondary bg-bg-secondary px-2 py-1.5 text-xs text-fg-primary"
            value={tr.toStateId}
            onChange={(e) => updateTransition(tr.id!, { toStateId: e.target.value })}
          >
            {definition.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="ds-stack gap-1">
        <span className="text-xs text-fg-secondary">Name</span>
        <Input
          value={tr.name}
          onChange={(e) => updateTransition(tr.id!, { name: e.target.value })}
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-fg-secondary">
        <input
          type="checkbox"
          checked={tr.requiresApproval}
          onChange={(e) =>
            updateTransition(tr.id!, {
              requiresApproval: e.target.checked,
            })
          }
        />
        Requires approval
      </label>

      <label className="ds-stack gap-1">
        <span className="text-xs text-fg-secondary">Approval mode (required)</span>
        <select
          className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
          value={tr.approvalMode}
          onChange={(e) => onApprovalModeChange(e.target.value as ApprovalMode)}
        >
          {APPROVAL_MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} title={o.description}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-fg-tertiary">
          Backend values: SINGLE, ALL (&quot;all must approve&quot;), QUORUM (threshold via quorumCount).
        </span>
      </label>

      {tr.approvalMode === 'QUORUM' ? (
        <label className="ds-stack gap-1">
          <span className="text-xs text-fg-secondary">Quorum threshold (quorumCount)</span>
          <Input
            type="number"
            min={1}
            value={tr.quorumCount ?? 1}
            onChange={(e) =>
              updateTransition(tr.id!, {
                quorumCount: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
              })
            }
          />
        </label>
      ) : null}

      <fieldset
        className={`ds-stack gap-1 border-0 p-0 ${!tr.requiresApproval ? 'opacity-60' : ''}`}
        disabled={!tr.requiresApproval}
      >
        <legend className="sr-only">Approvers</legend>
        <span className="text-xs text-fg-secondary">Approvers (tenant users)</span>
        <div className="max-h-32 overflow-y-auto rounded-md border border-border-tertiary bg-bg-primary p-2">
          {tenantUsers?.length ? (
            tenantUsers
              .filter((u) => u.status === 'ACTIVE' && u.roles.includes('APPROVER'))
              .map((u) => (
                <label key={u.userId} className="flex cursor-pointer items-center gap-2 py-1 text-xs text-fg-primary">
                  <input
                    type="checkbox"
                    checked={tr.approverUserIds.includes(u.userId)}
                    onChange={() => toggleApprover(u.userId)}
                    disabled={!tr.requiresApproval}
                  />
                  <span className="truncate">{u.email}</span>
                </label>
              ))
          ) : (
            <span className="text-xs text-fg-tertiary">Load users (pick a tenant) or add UUIDs in JSON.</span>
          )}
        </div>
      </fieldset>
      {tr.requiresApproval && !tr.approverUserIds.length ? (
        <p className="rounded-md border border-border-primary bg-bg-danger px-2 py-1 text-[11px] font-medium text-fg-primary">
          Pick at least one approver—the API rejects approvals without approverUserIds.
        </p>
      ) : null}

      <Button type="button" variant="danger" className="w-fit text-xs" onClick={() => removeTransition(tr.id!)}>
        Delete transition
      </Button>
    </div>
  );
}
