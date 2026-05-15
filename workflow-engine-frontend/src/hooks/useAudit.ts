import { useQuery } from '@tanstack/react-query';
import * as api from '@/api/audit';
import { queryKeys } from '@/hooks/queryKeys';

export function useAuditLogs(params: api.ListAuditQuery) {
  return useQuery({
    queryKey: queryKeys.audit(params as Record<string, unknown>),
    queryFn: () => api.listAuditLogs(params),
  });
}
