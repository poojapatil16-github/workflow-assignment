import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '@/store/session';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TenantsPage } from '@/pages/TenantsPage';
import { TenantMembersPage } from '@/pages/TenantMembersPage';
import { UsersPage } from '@/pages/UsersPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { WorkflowDetailPage } from '@/pages/WorkflowDetailPage';
import { ItemsPage } from '@/pages/ItemsPage';
import { ItemDetailPage } from '@/pages/ItemDetailPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { DelegationsPage } from '@/pages/DelegationsPage';
import { AuditPage } from '@/pages/AuditPage';
import { SlaPage } from '@/pages/SlaPage';
import { HealthPage } from '@/pages/HealthPage';

function ProtectedRoute() {
  const token = useSessionStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/:tenantId/members" element={<TenantMembersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="workflows/:id" element={<WorkflowDetailPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="items/:id" element={<ItemDetailPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="delegations" element={<DelegationsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="sla" element={<SlaPage />} />
          <Route path="health" element={<HealthPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
