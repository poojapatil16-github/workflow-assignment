import { useQuery } from '@tanstack/react-query';
import * as api from '@/api/health';
import { queryKeys } from '@/hooks/queryKeys';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.fetchHealth(),
    refetchInterval: 60_000,
  });
}
