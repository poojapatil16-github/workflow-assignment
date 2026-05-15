import { useMemo } from 'react';
import { useMe } from '@/hooks/useAuth';
import { useSessionStore } from '@/store/session';

/** Flags for selected tenant — platform ADMIN has implicit CREATOR+APPROVER on the backend. */
export function useTenantCapabilities() {
  const { data: me, isLoading } = useMe();
  const tenantId = useSessionStore((s) => s.tenantId);

  const isGlobalAdmin = me?.globalRole === 'ADMIN';

  const membershipForActiveTenant = useMemo(() => {
    if (!tenantId || !me) return undefined;
    return me.memberships.find((m) => m.tenant.id === tenantId);
  }, [tenantId, me]);

  const roles = membershipForActiveTenant?.roles ?? [];

  const hasDelegatedApproval = useMemo(() => {
    if (!tenantId || !me) return false;
    const received = (me as any).delegationsTo as { tenantId: string }[] | undefined;
    return received?.some((d) => d.tenantId === tenantId) ?? false;
  }, [tenantId, me]);

  const hasCreator = isGlobalAdmin || roles.includes('CREATOR');
  const hasApprover = isGlobalAdmin || roles.includes('APPROVER') || hasDelegatedApproval;

  const canOpenItemsArea = Boolean(tenantId && (isGlobalAdmin || hasCreator || hasApprover));
  const canOpenApprovals = Boolean(tenantId && (isGlobalAdmin || hasApprover));
  const canManageWorkflowDefinitions = Boolean(tenantId && isGlobalAdmin);
  /** List / GET workflow for items & runtime (tenant CREATOR or platform ADMIN). */
  const canViewWorkflowCatalog = Boolean(tenantId && hasCreator);
  const waitingForTenantAssignment = Boolean(me && !isGlobalAdmin && me.memberships.length === 0);

  return {
    me,
    isLoading,
    tenantId,
    isGlobalAdmin,
    hasCreator,
    hasApprover,
    canOpenItemsArea,
    canOpenApprovals,
    canManageWorkflowDefinitions,
    canViewWorkflowCatalog,
    waitingForTenantAssignment,
    tenantScopedRoles: roles,
  };
}