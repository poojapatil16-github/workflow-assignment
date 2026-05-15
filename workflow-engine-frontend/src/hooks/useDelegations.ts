import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/delegations';
import { queryKeys } from '@/hooks/queryKeys';

export function useDelegations() {
  return useQuery({ queryKey: queryKeys.delegations, queryFn: () => api.listDelegations() });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.CreateDelegationBody) => api.createDelegation(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.delegations }),
  });
}
