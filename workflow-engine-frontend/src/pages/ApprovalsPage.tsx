import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePendingApprovals, useApprove, useReject } from '@/hooks/useApprovals';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { Spinner, ErrorAlert, EmptyState } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';

export function ApprovalsPage() {
  const q = usePendingApprovals();
  const approve = useApprove();
  const reject = useReject();
  const [comment, setComment] = useState('');

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review assigned approvals. This list refreshes about every 30 seconds."
      />
      {q.isLoading ? <Spinner /> : null}
      {q.error ? <ErrorAlert message={getErrorMessage(q.error)} /> : null}
      <label className="ds-stack mb-4 max-w-md gap-1">
        <span className="text-xs text-fg-secondary">Optional comment (applies to next action)</span>
        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment" />
      </label>
      <div className="ds-stack">
        {q.data?.length ? (
          q.data.map((row) => {
            const r = row as Record<string, unknown>;
            const id = String(r.id ?? '');
            const item = r.item as
              | { id?: string; title?: string | null; currentState?: { name?: string } }
              | undefined;
            const tr = r.workflowTransition as { name?: string } | undefined;
            return (
              <Card key={id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg-primary">{tr?.name ?? 'Approval'}</span>
                      <Badge tone="warning">PENDING</Badge>
                    </div>
                    <p className="ds-muted mt-1">
                      Item: {item?.title?.trim() || item?.id || '—'} · {item?.currentState?.name ?? 'state'}
                    </p>
                    <p className="ds-muted font-mono text-xs">approval id: {id}</p>
                    {item?.id ? (
                      <Link className="text-xs text-fg-secondary underline" to={`/app/items/${item.id}`}>
                        Open item
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={approve.isPending || reject.isPending}
                      onClick={async () => {
                        await approve.mutateAsync({ id, body: { comment: comment.trim() || undefined } });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={approve.isPending || reject.isPending}
                      onClick={async () => {
                        await reject.mutateAsync({ id, body: { comment: comment.trim() || undefined } });
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : !q.isLoading ? (
          <EmptyState title="No pending approvals" hint="You are up to date." />
        ) : null}
      </div>
      {(approve.isError || reject.isError) && (
        <ErrorAlert message={getErrorMessage(approve.error ?? reject.error)} />
      )}
    </div>
  );
}
