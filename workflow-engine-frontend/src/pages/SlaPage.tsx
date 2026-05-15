import { useEffect, useMemo, useState } from 'react';
import { useSlaRules, useCreateSlaRule } from '@/hooks/useSla';
import { useWorkflows, useWorkflow } from '@/hooks/useWorkflows';
import { useTenantUsers } from '@/hooks/useUsers';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';

type WfState = { id: string; name: string };
type WfVersion = { id: string; version: number; status: string; states?: WfState[] };

export function SlaPage() {
  const [page, setPage] = useState(1);
  const listQ = useSlaRules({ page, limit: 20 });
  const usersQ = useTenantUsers();
  const workflowsQ = useWorkflows({ page: 1, limit: 50 });
  const create = useCreateSlaRule();

  const [workflowId, setWorkflowId] = useState('');
  const [workflowVersionId, setWorkflowVersionId] = useState('');
  const [workflowStateId, setWorkflowStateId] = useState('');
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [escalateToUserId, setEscalateToUserId] = useState('');

  const wfDetail = useWorkflow(workflowId || undefined);

  const published = useMemo(() => {
    const raw = wfDetail.data?.versions;
    if (!Array.isArray(raw)) return [] as WfVersion[];
    return (raw as WfVersion[]).filter((v) => v.status === 'PUBLISHED');
  }, [wfDetail.data?.versions]);

  const selectedVersion = published.find((v) => v.id === workflowVersionId);

  useEffect(() => {
    if (published.length === 1) setWorkflowVersionId(published[0].id);
    else if (!published.some((p) => p.id === workflowVersionId)) setWorkflowVersionId(published[0]?.id ?? '');
  }, [published, workflowVersionId]);

  useEffect(() => {
    const states = selectedVersion?.states ?? [];
    if (states.length && !states.some((s) => s.id === workflowStateId)) {
      setWorkflowStateId(states[0].id);
    }
  }, [selectedVersion, workflowStateId]);

  const pagination = listQ.data?.meta?.pagination as
    | { page?: number; totalPages?: number }
    | undefined;

  return (
    <div>
      <PageHeader title="SLA rules" description="Define time limits per published state, with optional escalation." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Create SLA Rule">
          <form
            className="ds-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await create.mutateAsync({
                workflowVersionId,
                workflowStateId,
                name,
                durationMinutes,
                escalateToUserId: escalateToUserId || undefined,
                enabled: true,
              });
              setName('');
            }}
          >
            <label className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">Workflow</span>
              <select
                className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                value={workflowId}
                onChange={(e) => {
                  setWorkflowId(e.target.value);
                  setWorkflowVersionId('');
                  setWorkflowStateId('');
                }}
                required
              >
                <option value="">Select…</option>
                {workflowsQ.data?.data.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            {workflowId ? (
              wfDetail.isLoading ? (
                <Spinner />
              ) : wfDetail.error ? (
                <ErrorAlert message={getErrorMessage(wfDetail.error)} />
              ) : (
                <>
                  <label className="ds-stack gap-1">
                    <span className="text-xs text-fg-secondary">Published version</span>
                    <select
                      className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                      value={workflowVersionId}
                      onChange={(e) => setWorkflowVersionId(e.target.value)}
                      required
                    >
                      {published.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ds-stack gap-1">
                    <span className="text-xs text-fg-secondary">State</span>
                    <select
                      className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                      value={workflowStateId}
                      onChange={(e) => setWorkflowStateId(e.target.value)}
                      required
                    >
                      {(selectedVersion?.states ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )
            ) : null}
            <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} required />
            <label className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">Duration (minutes)</span>
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </label>
            <label className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">Escalate to (optional)</span>
              <select
                className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                value={escalateToUserId}
                onChange={(e) => setEscalateToUserId(e.target.value)}
              >
                <option value="">None</option>
                {usersQ.data
                  ?.filter((u) => u.status === 'ACTIVE')
                  .map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.email}
                    </option>
                  ))}
              </select>
            </label>
            {create.isError ? <ErrorAlert message={getErrorMessage(create.error)} /> : null}
            <Button type="submit" disabled={create.isPending || !workflowVersionId || !workflowStateId}>
              Create SLA Rule
            </Button>
          </form>
        </Card>
        <Card title="Rules">
          {listQ.isLoading ? <Spinner /> : null}
          {listQ.error ? <ErrorAlert message={getErrorMessage(listQ.error)} /> : null}
          <ul className="ds-stack text-sm">
            {listQ.data?.data.map((r) => (
              <li key={r.id} className="rounded-md border border-border-tertiary px-3 py-2">
                <div className="font-medium text-fg-primary">{r.name}</div>
                <div className="ds-muted">
                  {r.durationMinutes} min · {r.enabled ? 'enabled' : 'disabled'}
                </div>
              </li>
            ))}
          </ul>
          {pagination && (pagination.totalPages ?? 1) > 1 ? (
            <div className="ds-row mt-4 justify-end">
              <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={(pagination.page ?? page) >= (pagination.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
