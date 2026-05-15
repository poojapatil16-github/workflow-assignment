import * as tenantService from '../tenants/tenant.service.js';

/** Same payload as `GET /tenants/:id/members` scoped to tenant from `X-Tenant-Id`. */
export async function listTenantUsers(tenantId: string) {
  return tenantService.listMembersForTenant(tenantId);
}
