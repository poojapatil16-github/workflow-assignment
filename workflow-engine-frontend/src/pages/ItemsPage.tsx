import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItems, useCreateItem } from '@/hooks/useItems';
import { useWorkflows, useWorkflow } from '@/hooks/useWorkflows';
import { useSessionStore } from '@/store/session';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { Spinner, ErrorAlert, EmptyState } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';

type WfVersion = { id: string; version: number; status: string };

function publishedVersions(versions: unknown): WfVersion[] {
  if (!Array.isArray(versions)) return [];
  return (versions as WfVersion[]).filter((v) => v.status === 'PUBLISHED');
}

export function ItemsPage() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const { hasCreator } = useTenantCapabilities();
  const [page, setPage] = useState(1);
  const limit = 12;
  const itemsQ = useItems({ page, limit, sortBy: 'createdAt', sortOrder: 'desc' });
  const listWf = useWorkflows({ page: 1, limit: 100 }, { enabled: hasCreator && !!tenantId });
  const create = useCreateItem();
  const [title, setTitle] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [workflowVersionId, setWorkflowVersionId] = useState('');

  const wfDetail = useWorkflow(workflowId || undefined, { enabled: hasCreator && !!workflowId });

  const pubs = useMemo(() => publishedVersions(wfDetail.data?.versions), [wfDetail.data?.versions]);

  useEffect(() => {
    if (pubs.length === 1) setWorkflowVersionId(pubs[0].id);
    else if (!pubs.some((p) => p.id === workflowVersionId)) setWorkflowVersionId(pubs[0]?.id ?? '');
  }, [pubs, workflowVersionId]);

  const pagination = itemsQ.data?.meta?.pagination as
    | { page?: number; limit?: number; total?: number; totalPages?: number }
    | undefined;

  return (
    <div>
      <PageHeader title="Items" description="Instances run on a published workflow version." />
      {!tenantId ? <ErrorAlert message="Select a tenant in the header to load tenant-scoped items." /> : null}
      {itemsQ.isLoading ? <Spinner /> : null}
      {itemsQ.error ? <ErrorAlert message={getErrorMessage(itemsQ.error)} /> : null}

      <div className={`grid gap-4 ${hasCreator ? 'xl:grid-cols-3' : ''}`}>
        {hasCreator ? (
        <Card title="Create Item" className="xl:col-span-1">
          <form
            className="ds-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await create.mutateAsync({
                workflowId,
                workflowVersionId,
                title: title.trim() || undefined,
              });
              setTitle('');
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
                }}
                required
              >
                <option value="">Select…</option>
                {listWf.data?.data.map((w) => (
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
                <label className="ds-stack gap-1">
                  <span className="text-xs text-fg-secondary">Published version</span>
                  <select
                    className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                    value={workflowVersionId}
                    onChange={(e) => setWorkflowVersionId(e.target.value)}
                    required
                  >
                    <option value="">Select…</option>
                    {pubs.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version}
                      </option>
                    ))}
                  </select>
                  {!pubs.length ? <span className="text-xs text-fg-tertiary">No PUBLISHED version — publish a draft first.</span> : null}
                </label>
              )
            ) : null}
            <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            {create.isError ? <ErrorAlert message={getErrorMessage(create.error)} /> : null}
            <Button type="submit" disabled={create.isPending || !tenantId || !workflowVersionId}>
              Create Item
            </Button>
          </form>
        </Card>
        ) : null}

        <div className={`ds-stack ${hasCreator ? 'xl:col-span-2' : ''}`}>
          <div className="ds-grid grid-cols-1 md:grid-cols-2">
            {itemsQ.data?.data.length ? (
              itemsQ.data.data.map((it) => (
                <Link
                  key={it.id}
                  to={`/app/items/${it.id}`}
                  className="ds-card block transition hover:border-border-primary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-fg-primary">{it.title?.trim() ? it.title : it.id}</div>
                      <div className="ds-muted mt-1">{it.workflow?.name ?? 'Workflow'}</div>
                    </div>
                    <Badge tone="info">v{it.version}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge tone="default">{(it.currentState as { name?: string } | undefined)?.name ?? 'State'}</Badge>
                    <Badge tone="default">{it.workflowVersion?.status ?? ''}</Badge>
                  </div>
                </Link>
              ))
            ) : tenantId && !itemsQ.isLoading ? (
              <EmptyState title="No items" hint="Create an item against a published workflow version." />
            ) : null}
          </div>
          {pagination && pagination.totalPages && pagination.totalPages > 1 ? (
            <div className="ds-row justify-end">
              <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <span className="text-xs text-fg-secondary">
                Page {pagination.page ?? page} / {pagination.totalPages}
              </span>
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
        </div>
      </div>
    </div>
  );
}
