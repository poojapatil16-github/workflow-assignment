import { useQuery } from '@tanstack/react-query';
import * as api from '@/api/users';
import { queryKeys } from '@/hooks/queryKeys';
import { useSessionStore } from '@/store/session';

export function useTenantUsers() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const token = useSessionStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.listTenantDirectory(),
    enabled: !!tenantId && !!token,
  });
}
