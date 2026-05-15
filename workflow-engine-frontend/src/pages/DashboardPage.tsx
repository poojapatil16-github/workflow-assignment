import { useQueries } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { fetchHealth } from '@/api/health';
import { listTenants } from '@/api/tenants';
import { listItems } from '@/api/items';
import { listPendingApprovals } from '@/api/approvals';
import { queryKeys } from '@/hooks/queryKeys';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';

export function DashboardPage() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const { canOpenItemsArea, canOpenApprovals, waitingForTenantAssignment } = useTenantCapabilities();
  const results = useQueries({
    queries: [
      { queryKey: queryKeys.health, queryFn: () => fetchHealth() },
      { queryKey: queryKeys.tenants, queryFn: () => listTenants() },
      {
        queryKey: queryKeys.items({ page: 1, limit: 5 }),
        queryFn: () => listItems({ page: 1, limit: 5 }),
        enabled: !!tenantId && canOpenItemsArea,
      },
      {
        queryKey: queryKeys.approvalsPending,
        queryFn: () => listPendingApprovals(),
        enabled: !!tenantId && canOpenApprovals,
      },
    ],
  });
  const [healthQ, tenantsQ, itemsQ, approvalsQ] = results;
  const loading = results.some((r) => r.isLoading);
  const err = results.find((r) => r.isError)?.error;

  return (
    <div>
      <PageHeader title="Dashboard" description="Tenant-scoped stats respect CREATOR/APPROVER platform RBAC." />
      {waitingForTenantAssignment ? (
        <p className="ds-muted mb-4 text-sm">Assign this account to a tenant with Members to populate workflow data below.</p>
      ) : null}
      {loading ? <Spinner /> : null}
      {err ? <ErrorAlert message={String(err)} /> : null}
      <div className="ds-grid mt-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card title="System health">
          {healthQ.data ? (
            <div className="ds-stack text-sm">
              <div>
                Status: <span className="text-fg-primary">{healthQ.data.status}</span>
              </div>
              {healthQ.data.database ? (
                <div>
                  Database: <span className="text-fg-primary">{healthQ.data.database}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <span className="ds-muted">Health data not loaded</span>
          )}
        </Card>
        <Card title="Tenants">
          <div className="text-2xl font-semibold text-fg-primary">{tenantsQ.data?.length ?? '—'}</div>
          <p className="ds-muted mt-1">Organizations you can reach</p>
        </Card>
        <Card title="Items (sample)">
          {itemsQ.data ? (
            <div className="ds-stack text-sm">
              <div>
                On first page:{' '}
                <span className="text-fg-primary font-semibold">{itemsQ.data.data.length}</span>
              </div>
              <div className="ds-muted">
                Total:{' '}
                {(itemsQ.data.meta as { pagination?: { total?: number } } | undefined)?.pagination?.total ?? '—'}
              </div>
            </div>
          ) : tenantId && canOpenItemsArea ? (
            <span className="ds-muted">Loading…</span>
          ) : (
            <span className="ds-muted">Select a tenant and ensure CREATOR or APPROVER access</span>
          )}
        </Card>
        <Card title="Pending approvals">
          <div className="text-2xl font-semibold text-fg-primary">{approvalsQ.data?.length ?? '—'}</div>
          <p className="ds-muted mt-1">Approver queue in this tenant</p>
        </Card>
      </div>
    </div>
  );
}
