import { useTenantUsers } from '@/hooks/useUsers';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import { useSessionStore } from '@/store/session';

export function UsersPage() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const { data, isLoading, error } = useTenantUsers();
  return (
    <div>
      <PageHeader
        title="Users"
        description="Platform ADMIN directory for X-Tenant-Id—mirror of Members plus cross-tenant membership hints."
      />
      {!tenantId ? <ErrorAlert message="Select a tenant in the header to load this directory." /> : null}
      {isLoading ? <Spinner /> : null}
      {error ? <ErrorAlert message={getErrorMessage(error)} /> : null}
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="text-fg-secondary">
            <tr>
              <th className="pb-2">User ID</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Scopes (tenant)</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Other tenants*</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row) => (
              <tr key={row.membershipId} className="border-t border-border-tertiary">
                <td className="py-2 font-mono text-[11px] text-fg-tertiary">{row.userId}</td>
                <td className="py-2 text-fg-primary">{row.email}</td>
                <td className="py-2 ds-muted">{row.roles.join(', ') || '—'}</td>
                <td className="py-2 ds-muted">{row.status}</td>
                <td className="max-w-[200px] py-2 ds-muted">{row.tenantIds.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-fg-tertiary">
          * Other tenant memberships for that user across the organization.
        </p>
      </Card>
    </div>
  );
}
