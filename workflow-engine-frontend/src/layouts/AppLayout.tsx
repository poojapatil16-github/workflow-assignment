import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMe } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useAuth';
import { useSessionStore } from '@/store/session';
import { Button } from '@/components/Button';
import { useTenants } from '@/hooks/useTenants';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';
import { ErrorAlert } from '@/components/Feedback';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type NavItem = { to: string; label: string; tag: string; show: boolean; end?: boolean };

export function AppLayout() {
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: me, isLoading } = useMe();
  const tenantId = useSessionStore((s) => s.tenantId);
  const setTenantId = useSessionStore((s) => s.setTenantId);
  const { data: tenantsList } = useTenants();

  const {
    waitingForTenantAssignment,
    canOpenItemsArea,
    canOpenApprovals,
    isGlobalAdmin,
    canViewWorkflowCatalog,
    tenantScopedRoles,
  } = useTenantCapabilities();

  const tenantOptions =
    me?.globalRole === 'ADMIN' ? (tenantsList ?? []) : (me?.memberships.map((m) => m.tenant) ?? []);

  const NAV: NavItem[] = [
    { to: '/app', label: 'Dashboard', end: true, tag: 'Dashboard', show: true },
    { to: '/app/tenants', label: 'Tenants', tag: 'Tenants', show: true },
    { to: '/app/users', label: 'Users', tag: 'Users', show: isGlobalAdmin && !!tenantId },
    { to: '/app/workflows', label: 'Workflows', tag: 'Workflows', show: canViewWorkflowCatalog },
    {
      to: '/app/items',
      label: 'Items',
      tag: 'Items',
      show: canOpenItemsArea,
    },
    { to: '/app/approvals', label: 'Approvals', tag: 'Approvals', show: canOpenApprovals },
    {
      to: '/app/delegations',
      label: 'Delegations',
      tag: 'Delegations',
      show: !!tenantId && (isGlobalAdmin || tenantScopedRoles.some((r) => r === 'CREATOR' || r === 'APPROVER')),
    },
    {
      to: '/app/audit',
      label: 'Audit',
      tag: 'Audit',
      show: isGlobalAdmin && !!tenantId,
    },
    { to: '/app/sla', label: 'SLA', tag: 'SLA', show: isGlobalAdmin && !!tenantId },
    { to: '/app/health', label: 'Health', tag: 'Health', show: true },
  ];

  return (
    <div className="flex min-h-screen">
      <aside
        className="fixed left-0 top-0 z-20 flex h-full w-[var(--sidebar-width)] flex-col border-r border-border-tertiary bg-bg-secondary"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="border-b border-border-tertiary px-3 py-3 text-sm font-semibold text-fg-primary">Workflow</div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV.filter((item) => item.show).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end === true}
              className={({ isActive }) =>
                `rounded-md px-2 py-2 text-sm ${isActive ? 'bg-bg-info text-fg-primary' : 'text-fg-secondary hover:bg-bg-primary'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col pl-[var(--sidebar-width)]">
        <header
          className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b border-border-tertiary bg-bg-primary px-4"
          style={{ height: 'var(--topbar-height)' }}
        >
          <div className="text-sm text-fg-secondary">
            {isLoading ? (
              '…'
            ) : me ? (
              <span className="text-fg-primary">
                {me.email}
                <span className="ds-muted ml-2 text-xs">· {me.globalRole}</span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <label className="ds-muted hidden sm:block">Tenant</label>
            <select
              className="max-w-[220px] rounded-md border border-border-secondary bg-bg-secondary px-2 py-1.5 text-xs text-fg-primary"
              value={tenantId ?? ''}
              onChange={(e) => setTenantId(e.target.value || null)}
              disabled={!tenantOptions.length}
            >
              <option value="">{waitingForTenantAssignment ? 'No tenant access yet' : 'Select tenant…'}</option>
              {tenantOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              className="!py-1.5 text-xs"
              onClick={() => {
                logout();
                void navigate('/login');
              }}
            >
              Log out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-5">
          {waitingForTenantAssignment ? (
            <div className="mb-5">
              <ErrorAlert message="Your account is active but not assigned to any tenant yet. A platform ADMIN must add you with CREATOR and/or APPROVER roles." />
            </div>
          ) : null}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
