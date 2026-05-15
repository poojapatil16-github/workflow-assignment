import { useMemo, useState } from 'react';
import { useMe } from '@/hooks/useAuth';
import { useDelegations, useCreateDelegation } from '@/hooks/useDelegations';
import { useTenantMembers } from '@/hooks/useTenants';
import { useSessionStore } from '@/store/session';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';

export function DelegationsPage() {
  const meQ = useMe();
  const tenantId = useSessionStore((s) => s.tenantId);
  const membersQ = useTenantMembers(tenantId);
  const listQ = useDelegations();
  const create = useCreateDelegation();
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');

  const emailByUserId = useMemo(() => {
    const m = new Map<string, string>();
    membersQ.data?.forEach((mem) => m.set(mem.userId, mem.email));
    return m;
  }, [membersQ.data]);

  const eligibleToUsers = useMemo(() => {
    return membersQ.data?.filter(m => m.roles.includes('CREATOR') && m.userId !== meQ.data?.id) ?? [];
  }, [membersQ.data, meQ.data]);

  if (meQ.isLoading || (tenantId && membersQ.isLoading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Delegations" description="Delegate your approval authority to another eligible user (CREATOR)." />
      {!tenantId ? <ErrorAlert message="Select a tenant to load members for picker labels." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Create Delegation">
          <form
            className="ds-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await create.mutateAsync({
                fromUserId,
                toUserId,
              });
              setFromUserId('');
              setToUserId('');
            }}
          >
            <label className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">From Approver</span>
              <select
                className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                value={fromUserId}
                onChange={(e) => setFromUserId(e.target.value)}
                required
              >
                <option value="">Select Approver…</option>
                {membersQ.data?.filter(m => m.roles.includes('APPROVER') && m.userId === meQ.data?.id).map((mem) => (
                  <option key={mem.userId} value={mem.userId}>
                    {mem.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">To Eligible Delegate (CREATOR)</span>
              <select
                className="rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary"
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                required
              >
                <option value="">Select Delegate…</option>
                {eligibleToUsers.map((mem) => (
                  <option key={`to-${mem.userId}`} value={mem.userId}>
                    {mem.email}
                  </option>
                ))}
              </select>
            </label>
            {create.isError ? <ErrorAlert message={getErrorMessage(create.error)} /> : null}
            <Button type="submit" disabled={create.isPending}>
              Create Delegation
            </Button>
          </form>
        </Card>
        <Card title="Delegations">
          {listQ.isLoading ? <Spinner /> : null}
          {listQ.error ? <ErrorAlert message={getErrorMessage(listQ.error)} /> : null}
          <ul className="ds-stack text-sm">
            {listQ.data?.filter(d => (d as any).active !== false).map((d) => (
              <li key={d.id} className="rounded-md border border-border-tertiary px-3 py-2">
                <div className="text-fg-primary">
                  {emailByUserId.get(d.fromUserId) ?? d.fromUserId} → {emailByUserId.get(d.toUserId) ?? d.toUserId}
                </div>
                <div className="ds-muted mt-1">
                  Active since {new Date(d.createdAt ?? '').toLocaleString()}
                </div>
              </li>
            ))}
            {listQ.data?.filter(d => (d as any).active !== false).length === 0 && (
              <p className="ds-muted">No active delegations.</p>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
