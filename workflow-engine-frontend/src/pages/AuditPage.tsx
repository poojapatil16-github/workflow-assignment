import { useState } from 'react';
import { CircleDot } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAudit';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spinner, ErrorAlert, EmptyState } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import type { AuditLogRow } from '@/api/audit';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const limit = 25;
  const [draftSearch, setDraftSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const q = useAuditLogs({ page, limit, search: searchQuery, sortOrder: 'desc' });

  const pagination = q.data?.meta?.pagination as
    | { page?: number; limit?: number; total?: number; totalPages?: number }
    | undefined;

  return (
    <div>
      <PageHeader title="Audit log" description="Immutable activity timeline, newest first." />
      <Card className="mb-4">
        <form
          className="ds-row flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            setSearchQuery(draftSearch.trim() || undefined);
            setPage(1);
          }}
        >
          <Input
            placeholder="Search"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="ghost">
            Search
          </Button>
        </form>
      </Card>
      {q.isLoading ? <Spinner /> : null}
      {q.error ? <ErrorAlert message={getErrorMessage(q.error)} /> : null}
      {!q.isLoading && !q.data?.data.length ? (
        <EmptyState title="No audit rows" hint="Adjust search or page, or perform actions that emit audit events." />
      ) : (
        <div className="relative ds-stack pl-6">
          <div className="absolute bottom-0 left-[11px] top-0 w-[0.5px] bg-border-tertiary" aria-hidden />
          {q.data?.data.map((row: AuditLogRow) => (
            <div key={row.id} className="relative flex gap-3">
              <div className="absolute -left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border-primary bg-bg-secondary text-fg-secondary">
                <CircleDot className="h-3.5 w-3.5" aria-hidden />
              </div>
              <Card className="flex-1 !py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg-primary">{row.action}</span>
                  <span className="text-xs text-fg-tertiary">
                    {row.entityType} · {row.entityId}
                  </span>
                </div>
                <div className="ds-muted mt-1">{row.createdAt}</div>
              </Card>
            </div>
          ))}
        </div>
      )}
      {pagination && (pagination.totalPages ?? 1) > 1 ? (
        <div className="ds-row mt-4 justify-end">
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
  );
}
