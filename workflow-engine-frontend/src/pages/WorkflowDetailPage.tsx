import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useCreateWorkflowVersion,
  usePublishWorkflow,
  useWorkflow,
} from '@/hooks/useWorkflows';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import { workflowDefinitionSchema } from '@/types/workflow-definition';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';

type WfTransition = {
  id: string;
  name: string;
  fromStateId: string;
  toStateId: string;
  requiresApproval?: boolean;
  approvalMode?: string | null;
  quorumCount?: number | null;
  fromState?: { name?: string };
  toState?: { name?: string };
};

type WfState = { id: string; name: string; isInitial?: boolean };

type WfVersion = {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  states?: WfState[];
  transitions?: WfTransition[];
};

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canManageWorkflowDefinitions, canViewWorkflowCatalog } = useTenantCapabilities();
  const q = useWorkflow(id, { enabled: !!id && canViewWorkflowCatalog });
  const createVer = useCreateWorkflowVersion();
  const publish = usePublishWorkflow();
  const [verIdx, setVerIdx] = useState(0);
  const [definitionOverride, setDefinitionOverride] = useState('');
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [publishPick, setPublishPick] = useState('');

  const wf = q.data;
  const versions: WfVersion[] = useMemo(() => {
    const raw = wf?.versions;
    return Array.isArray(raw) ? (raw as WfVersion[]) : [];
  }, [wf?.versions]);

  useEffect(() => {
    if (verIdx >= versions.length) setVerIdx(0);
  }, [verIdx, versions.length]);

  const selected = versions[verIdx];
  const draftVersions = useMemo(() => versions.filter((v) => v.status === 'DRAFT'), [versions]);

  useEffect(() => {
    if (!draftVersions.length) {
      setPublishPick('');
      return;
    }
    if (!draftVersions.some((d) => d.id === publishPick)) {
      setPublishPick(draftVersions[0].id);
    }
  }, [draftVersions, publishPick]);

  return (
    <div>
      <PageHeader
        title={wf?.name ?? 'Workflow'}
        description={
          canManageWorkflowDefinitions
            ? 'Inspect the graph by version, add draft versions, and publish when ready.'
            : 'Read-only view of workflow structure and versions (create items under Items).'
        }
        actions={
          <Link to="/app/workflows" className="text-sm text-fg-secondary underline">
            ← All workflows
          </Link>
        }
      />
      {q.isLoading ? <Spinner /> : null}
      {q.error ? <ErrorAlert message={getErrorMessage(q.error)} /> : null}
      {wf && selected ? (
        <div className="ds-stack mt-4">
          <div className="ds-row flex-wrap items-end">
            <label className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">Version</span>
              <select
                className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                value={verIdx}
                onChange={(e) => setVerIdx(Number(e.target.value))}
              >
                {versions.map((v, i) => (
                  <option key={v.id} value={i}>
                    v{v.version} — {v.status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="States">
              <div className="ds-row flex-wrap">
                {(selected.states ?? []).map((s) => (
                  <span
                    key={s.id}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      s.isInitial ? 'border-border-primary bg-bg-success text-fg-primary' : 'border-border-tertiary bg-bg-secondary text-fg-secondary'
                    }`}
                  >
                    {s.name}
                    {s.isInitial ? ' · initial' : ''}
                  </span>
                ))}
              </div>
            </Card>
            <Card title="Transitions">
              <ul className="ds-stack text-sm">
                {(selected.transitions ?? []).map((t) => (
                  <li key={t.id} className="rounded-md border border-border-tertiary px-3 py-2">
                    <div className="font-medium text-fg-primary">{t.name}</div>
                    <div className="ds-muted mt-0.5">
                      {(t.fromState?.name ?? t.fromStateId) ?? '?'} → {(t.toState?.name ?? t.toStateId) ?? '?'}
                      {t.requiresApproval
                        ? ` · approval (${t.approvalMode ?? '—'}${t.approvalMode === 'QUORUM' && t.quorumCount != null ? `, q=${t.quorumCount}` : ''})`
                        : ''}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {canManageWorkflowDefinitions ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="New Draft Version">
                <p className="ds-muted mb-3">
                  An empty body clones the latest graph. Optionally paste full definition JSON (same shape as when you create a
                  workflow).
                </p>
                <div className="ds-stack">
                  <textarea
                    className="min-h-[140px] w-full rounded-md border border-border-secondary bg-bg-secondary p-3 font-mono text-xs text-fg-primary"
                    placeholder="{}"
                    value={definitionOverride}
                    onChange={(e) => setDefinitionOverride(e.target.value)}
                  />
                  {parseErr ? <ErrorAlert message={parseErr} /> : null}
                  {createVer.isError ? <ErrorAlert message={getErrorMessage(createVer.error)} /> : null}
                  <Button
                    type="button"
                    disabled={createVer.isPending || !id}
                    onClick={async () => {
                      setParseErr(null);
                      const trimmed = definitionOverride.trim();
                      let body: { definition?: Record<string, unknown> } = {};
                      if (trimmed.length) {
                        let parsedJson: unknown;
                        try {
                          parsedJson = JSON.parse(trimmed) as unknown;
                        } catch {
                          setParseErr('Invalid JSON');
                          return;
                        }
                        const parsed = workflowDefinitionSchema.safeParse(parsedJson);
                        if (!parsed.success) {
                          setParseErr(parsed.error.issues.map((i) => i.message).join('; '));
                          return;
                        }
                        body = { definition: parsed.data as unknown as Record<string, unknown> };
                      }
                      await createVer.mutateAsync({ id: id!, body });
                      setDefinitionOverride('');
                    }}
                  >
                    Create Draft Version
                  </Button>
                </div>
              </Card>

              <Card title="Publish Draft">
                {draftVersions.length ? (
                  <form
                    className="ds-stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await publish.mutateAsync({ id: id!, body: { versionId: publishPick } });
                    }}
                  >
                    <label className="ds-stack gap-1">
                      <span className="text-xs text-fg-secondary">Draft version id</span>
                      <select
                        className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                        value={publishPick}
                        onChange={(e) => setPublishPick(e.target.value)}
                        required
                      >
                        {draftVersions.map((d) => (
                          <option key={d.id} value={d.id}>
                            v{d.version} ({d.id.slice(0, 8)}…)
                          </option>
                        ))}
                      </select>
                    </label>
                    {publish.isError ? <ErrorAlert message={getErrorMessage(publish.error)} /> : null}
                    <Button type="submit" disabled={publish.isPending || !publishPick}>
                      Publish Version
                    </Button>
                  </form>
                ) : (
                  <p className="ds-muted">No DRAFT versions to publish.</p>
                )}
              </Card>
            </div>
          ) : (
            <p className="ds-muted mt-4 text-xs">
              Editing versions or publishing drafts requires platform ADMIN; use Items to create and drive workflow instances.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
