import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTenantMembers, useAddMember, useRemoveTenantMember, usePatchTenantMemberRoles } from '@/hooks/useTenants';
import { useSessionStore } from '@/store/session';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import type { TenantScopedRole } from '@/api/tenants';

function RoleToggles(props: {
  value: TenantScopedRole[];
  onChange: (next: TenantScopedRole[]) => void;
}) {
  const { value, onChange } = props;
  function toggle(r: TenantScopedRole) {
    const set = new Set(value);
    if (set.has(r)) set.delete(r);
    else set.add(r);
    onChange(Array.from(set));
  }
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <label className="flex cursor-pointer items-center gap-1">
        <input type="checkbox" checked={value.includes('CREATOR')} onChange={() => toggle('CREATOR')} />
        CREATOR (items & transitions)
      </label>
      <label className="flex cursor-pointer items-center gap-1">
        <input type="checkbox" checked={value.includes('APPROVER')} onChange={() => toggle('APPROVER')} />
        APPROVER (approve / reject)
      </label>
    </div>
  );
}

export function TenantMembersPage() {
  const { tenantId: routeTenantId } = useParams<{ tenantId: string }>();
  const storeTenant = useSessionStore((s) => s.tenantId);
  const setTenant = useSessionStore((s) => s.setTenantId);
  const { data, isLoading, error } = useTenantMembers(routeTenantId ?? null);
  const add = useAddMember(routeTenantId ?? null);
  const removeM = useRemoveTenantMember(routeTenantId ?? null);
  const patchRoles = usePatchTenantMemberRoles(routeTenantId ?? null);
  const [email, setEmail] = useState('');
  const [addRoles, setAddRoles] = useState<TenantScopedRole[]>(['CREATOR']);
  const [editingRoles, setEditingRoles] = useState<Record<string, TenantScopedRole[]>>({});

  const canMutate = Boolean(routeTenantId && storeTenant === routeTenantId);

  return (
    <div>
      <PageHeader
        title="Tenant members"
        description="Platform ADMIN: assign CREATOR/APPROVER per tenant. Users must register first via Sign up."
        actions={
          routeTenantId && storeTenant !== routeTenantId ? (
            <Button type="button" variant="ghost" onClick={() => setTenant(routeTenantId)}>
              Set active tenant
            </Button>
          ) : null
        }
      />
      {routeTenantId && storeTenant !== routeTenantId ? (
        <ErrorAlert message="Use Set active tenant so your session matches this tenant." />
      ) : null}
      {isLoading ? <Spinner /> : null}
      {error ? <ErrorAlert message={getErrorMessage(error)} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Assign user">
          <form
            className="ds-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (addRoles.length === 0) return;
              await add.mutateAsync({ email, roles: addRoles });
              setEmail('');
            }}
          >
            <label className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">Email (existing registered account)</span>
              <Input type="email" placeholder="user@tenant.example" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <div className="ds-stack gap-1">
              <span className="text-xs text-fg-secondary">Tenant roles</span>
              <RoleToggles value={addRoles} onChange={setAddRoles} />
            </div>
            {add.isError ? <ErrorAlert message={getErrorMessage(add.error)} /> : null}
            <Button type="submit" disabled={add.isPending || !routeTenantId || !canMutate || addRoles.length === 0}>
              Add member
            </Button>
          </form>
        </Card>
        <Card title="Members">
          <ul className="ds-stack text-sm">
            {data?.map((m) => (
              <li key={m.membershipId} className="flex flex-wrap items-start justify-between gap-2 border-b border-border-tertiary py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-fg-primary">{m.email}</div>
                  <div className="mt-1 font-mono text-[11px] text-fg-tertiary">{m.userId}</div>
                  <div className="ds-muted mt-2 text-xs">Status: {m.status}</div>
                  <div className="ds-muted mt-3 text-[11px]">Also in tenants: {m.tenantIds.length ? m.tenantIds.join(', ') : '—'}</div>
                  <div className="mt-3">
                    <span className="text-[11px] text-fg-secondary">Roles:</span>
                    <RoleToggles
                      value={editingRoles[m.userId] ?? m.roles}
                      onChange={(next) => setEditingRoles((prev) => ({ ...prev, [m.userId]: next }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 !py-1.5 text-xs"
                      disabled={patchRoles.isPending || !canMutate || !(editingRoles[m.userId]?.length ?? m.roles.length)}
                      onClick={async () => {
                        const next = editingRoles[m.userId] ?? m.roles;
                        if (!next.length) return;
                        await patchRoles.mutateAsync({ userId: m.userId, roles: next });
                      }}
                    >
                      Save roles
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  className="!py-1.5 text-xs"
                  disabled={removeM.isPending || !canMutate}
                  onClick={async () => {
                    await removeM.mutateAsync(m.userId);
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          {removeM.isError ? <ErrorAlert message={getErrorMessage(removeM.error)} /> : null}
          {patchRoles.isError ? <ErrorAlert message={getErrorMessage(patchRoles.error)} /> : null}
        </Card>
      </div>
    </div>
  );
}
