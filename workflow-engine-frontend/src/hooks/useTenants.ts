import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/tenants';
import { queryKeys } from '@/hooks/queryKeys';
import { useSessionStore } from '@/store/session';

export function useTenants() {
  const token = useSessionStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.listTenants(),
    enabled: !!token,
  });
}

export function useTenantMembers(tenantId: string | null) {
  const token = useSessionStore((s) => s.token);
  return useQuery({
    queryKey: tenantId ? queryKeys.tenantMembers(tenantId) : ['tenants', 'members', 'idle'],
    queryFn: () => api.listTenantMembers(tenantId!),
    enabled: !!tenantId && !!token,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.CreateTenantBody) => api.createTenant(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.tenants }),
  });
}

export function useAddMember(tenantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.AddMemberBody) => {
      if (!tenantId) throw new Error('No tenant selected');
      return api.addTenantMember(tenantId, body);
    },
    onSuccess: () => {
      if (tenantId) {
        void qc.invalidateQueries({ queryKey: queryKeys.tenantMembers(tenantId) });
        void qc.invalidateQueries({ queryKey: queryKeys.users });
      }
    },
  });
}

export function usePatchTenantMemberRoles(tenantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: string; roles: api.AddMemberBody['roles'] }) => {
      if (!tenantId) throw new Error('No tenant selected');
      return api.patchTenantMemberRoles(tenantId, args.userId, { roles: args.roles });
    },
    onSuccess: () => {
      if (tenantId) {
        void qc.invalidateQueries({ queryKey: queryKeys.tenantMembers(tenantId) });
        void qc.invalidateQueries({ queryKey: queryKeys.users });
      }
    },
  });
}

export function useRemoveTenantMember(tenantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => {
      if (!tenantId) throw new Error('No tenant selected');
      return api.removeTenantMember(tenantId, userId);
    },
    onSuccess: () => {
      if (tenantId) {
        void qc.invalidateQueries({ queryKey: queryKeys.tenantMembers(tenantId) });
        void qc.invalidateQueries({ queryKey: queryKeys.users });
        void qc.invalidateQueries({ queryKey: queryKeys.tenants });
        void qc.invalidateQueries({ queryKey: queryKeys.me });
      }
    },
  });
}
