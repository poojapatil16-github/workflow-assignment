import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useWorkflows, useCreateWorkflow } from '@/hooks/useWorkflows';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import { createWorkflowFormSchema } from '@/types/workflow-definition';
import type { WorkflowGraphDefinition } from '@/types/workflow-graph';
import { useWorkflowBuilderStore } from '@/store/workflowBuilderStore';
import { syncWorkflowLiveJsonIntoStore } from '@/components/workflow-builder/workflowLiveJson';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';

const WorkflowBuilderPanel = lazy(async () => {
  const m = await import('@/components/workflow-builder/WorkflowBuilderPanel');
  return { default: m.WorkflowBuilderPanel };
});

const defaultDefinition: WorkflowGraphDefinition = {
  states: [
    { name: 'draft', isInitial: true },
    { name: 'done', isInitial: false },
  ],
  transitions: [
    {
      name: 'submit',
      fromStateName: 'draft',
      toStateName: 'done',
      requiresApproval: false,
      approvalMode: 'SINGLE',
      approverUserIds: [],
    },
  ],
};

export function WorkflowsPage() {
  const { canManageWorkflowDefinitions, canViewWorkflowCatalog } = useTenantCapabilities();
  const q = useWorkflows({ page: 1, limit: 50 }, { enabled: canViewWorkflowCatalog });
  const create = useCreateWorkflow();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const resetBuilder = useWorkflowBuilderStore((s) => s.reset);

  useEffect(() => {
    resetBuilder(defaultDefinition);
  }, [resetBuilder]);

  return (
    <div>
      <PageHeader
        title="Workflows"
        description={
          canManageWorkflowDefinitions
            ? 'Create workflow definitions below, or open a workflow to edit versions and publish.'
            : 'Browse published and draft versions to create items and run transitions.'
        }
      />
      {q.isLoading ? <Spinner /> : null}
      {q.error ? <ErrorAlert message={getErrorMessage(q.error)} /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {canManageWorkflowDefinitions ? (
        <Card title="Create Workflow (version 1 draft)" className="xl:col-span-2">
          <form
            className="ds-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setParseError(null);

              const live = syncWorkflowLiveJsonIntoStore();
              if (!live.ok) {
                setParseError(live.message);
                return;
              }

              const definition = useWorkflowBuilderStore.getState().definition;
              const { stringifyDefinition } = await import('@/lib/workflowDefinitionValidation');
              const finalPayload = {
                name,
                description: description || undefined,
                definition: JSON.parse(stringifyDefinition(definition)),
              };

              const parsed = createWorkflowFormSchema.safeParse(finalPayload);
              if (!parsed.success) {
                setParseError(parsed.error.issues.map((i) => i.message).join('; '));
                return;
              }
              await create.mutateAsync(parsed.data);
              setName('');
              setDescription('');
              resetBuilder(defaultDefinition);
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Suspense fallback={<Spinner />}>
              <WorkflowBuilderPanel />
            </Suspense>
            {parseError ? <ErrorAlert message={parseError} /> : null}
            {create.isError ? <ErrorAlert message={getErrorMessage(create.error)} /> : null}
            <Button type="submit" disabled={create.isPending}>
              Create Workflow
            </Button>
          </form>
        </Card>
        ) : null}
        <Card title="Workflow list" className="xl:col-span-2">
          <ul className="ds-stack text-sm">
            {q.data?.data.map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-md border border-border-tertiary px-3 py-2">
                <div>
                  <div className="font-medium text-fg-primary">{w.name}</div>
                  <div className="ds-muted">
                    Latest v{w.versions?.[0]?.version ?? '?'} — {w.versions?.[0]?.status}
                  </div>
                </div>
                <Link to={`/app/workflows/${w.id}`} className="text-xs underline text-fg-secondary">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
