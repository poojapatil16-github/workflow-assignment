import { useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Plus } from 'lucide-react';

import { useTenantUsers } from '@/hooks/useUsers';
import { useSessionStore } from '@/store/session';
import { validateWorkflowDefinition } from '@/lib/workflowDefinitionValidation';
import { suggestStateName, useWorkflowBuilderStore } from '@/store/workflowBuilderStore';
import { Button } from '@/components/Button';
import { ErrorAlert } from '@/components/Feedback';
import { WorkflowFlowCanvas } from './WorkflowFlowCanvas';
import { WorkflowJsonEditorPanel } from './WorkflowJsonEditorPanel';
import { WorkflowInspector } from './WorkflowInspector';

export function WorkflowBuilderPanel() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const membersQ = useTenantUsers();
  const definition = useWorkflowBuilderStore((s) => s.definition);
  const jsonError = useWorkflowBuilderStore((s) => s.jsonError);
  const addState = useWorkflowBuilderStore((s) => s.addState);

  const modelErrors = useMemo(() => {
    const res = validateWorkflowDefinition(definition);
    return res.ok ? [] : res.errors;
  }, [definition]);

  const approverSource = membersQ.data;

  const onAddState = () => {
    const names = new Set(useWorkflowBuilderStore.getState().definition.states.map((s) => s.name));
    addState(suggestStateName(names));
  };

  return (
    <div className="ds-stack gap-3">
      {!tenantId ? (
        <p className="text-xs text-fg-tertiary">Select a tenant in the header to load approver emails for transitions.</p>
      ) : null}

      {modelErrors.length ? <ErrorAlert message={modelErrors.join(' · ')} /> : null}
      {jsonError ? <ErrorAlert message={jsonError} /> : null}

      <div className="flex min-h-[520px] flex-col gap-4 lg:min-h-[560px] lg:flex-row">
        <div className="flex min-h-[360px] min-w-0 flex-[1.1] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" className="!py-1.5 text-xs" onClick={onAddState}>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add state
              </span>
            </Button>
            <span className="text-[11px] text-fg-tertiary">
              Drag from a node’s handle to another to add a transition. Delete with Backspace/Delete.
            </span>
          </div>

          <ReactFlowProvider>
            <div className="min-h-[300px] flex-1 lg:min-h-0">
              <WorkflowFlowCanvas />
            </div>
          </ReactFlowProvider>

          <WorkflowInspector tenantUsers={approverSource} />
        </div>

        <div className="flex min-h-[280px] min-w-0 flex-1 flex-col">
          <WorkflowJsonEditorPanel />
        </div>
      </div>
    </div>
  );
}
