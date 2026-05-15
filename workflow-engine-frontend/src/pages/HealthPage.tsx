import { useHealth } from '@/hooks/useHealth';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';

export function HealthPage() {
  const q = useHealth();
  return (
    <div>
      <PageHeader title="Health" description="Public liveness check — no tenant context required." />
      {q.isLoading ? <Spinner /> : null}
      {q.error ? <ErrorAlert message={getErrorMessage(q.error)} /> : null}
      {q.data ? (
        <Card title="Response">
          <div className="ds-row mb-4 flex-wrap">
            <Badge tone={q.data.status === 'ok' ? 'success' : 'warning'}>{q.data.status}</Badge>
            {q.data.database ? <Badge tone="info">DB: {q.data.database}</Badge> : null}
          </div>
          <pre className="overflow-x-auto rounded-md border border-border-tertiary bg-bg-primary p-4 font-mono text-xs text-fg-secondary">
            {JSON.stringify(q.data, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
