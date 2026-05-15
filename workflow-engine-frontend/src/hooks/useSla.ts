import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/sla';
import { queryKeys } from '@/hooks/queryKeys';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';

export function useSlaRules(params: api.ListSlaQuery) {
  return useQuery({
    queryKey: queryKeys.sla(params as Record<string, unknown>),
    queryFn: () => api.listSlaRules(params),
  });
}

export function useCreateSlaRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.CreateSlaBody) => api.createSlaRule(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sla'] }),
  });
}

export function useSlaBreaches() {
  const { tenantId } = useTenantCapabilities();
  return useQuery({
    queryKey: ['sla', 'breaches', tenantId],
    queryFn: () => api.getSlaBreaches(tenantId || ''),
    enabled: !!tenantId,
  });
}

export function useEscalateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, slaRuleId }: { itemId: string; slaRuleId: string }) =>
      api.escalateItem(itemId, slaRuleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sla', 'breaches'] });
      void qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
