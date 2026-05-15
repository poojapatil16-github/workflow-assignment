/**
 * API path constants — aligned with backend OpenAPI (`src/config/openapi-spec.ts` served at `/api-docs`).
 */
export const PATHS = {
  health: '/health',
  authLogin: '/api/v1/auth/login',
  authRegister: '/api/v1/auth/register',
  authMe: '/api/v1/auth/me',
  tenants: '/api/v1/tenants',
  tenantMembers: (tenantId: string) => `/api/v1/tenants/${tenantId}/members`,
  tenantMember: (tenantId: string, userId: string) => `/api/v1/tenants/${tenantId}/members/${userId}`,
  users: '/api/v1/users',
  workflows: '/api/v1/workflows',
  workflow: (id: string) => `/api/v1/workflows/${id}`,
  workflowVersion: (id: string) => `/api/v1/workflows/${id}/version`,
  workflowPublish: (id: string) => `/api/v1/workflows/${id}/publish`,
  items: '/api/v1/items',
  item: (id: string) => `/api/v1/items/${id}`,
  itemTransitions: (id: string) => `/api/v1/items/${id}/transitions`,
  approvalsPending: '/api/v1/approvals/pending',
  approvalApprove: (id: string) => `/api/v1/approvals/${id}/approve`,
  approvalReject: (id: string) => `/api/v1/approvals/${id}/reject`,
  delegations: '/api/v1/delegations',
  auditLogs: '/api/v1/audit-logs',
  slaRules: '/api/v1/sla-rules',
  slaBreaches: (tenantId: string) => `/api/v1/sla-rules/tenants/${tenantId}/breaches`,
  slaEscalate: (itemId: string) => `/api/v1/sla-rules/items/${itemId}/escalate`,
} as const;
