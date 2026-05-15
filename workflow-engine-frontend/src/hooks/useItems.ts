import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/items';
import { queryKeys } from '@/hooks/queryKeys';

export function useItems(params: api.ListItemsQuery) {
  return useQuery({
    queryKey: queryKeys.items(params as Record<string, unknown>),
    queryFn: () => api.listItems(params),
  });
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.item(id) : ['items', 'detail', 'idle'],
    queryFn: () => api.getItem(id!),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.CreateItemBody) => api.createItem(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useTransitionItem(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: api.TransitionBody; idempotencyKey?: string }) =>
      api.transitionItem(itemId, body, idempotencyKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.item(itemId) });
      void qc.invalidateQueries({ queryKey: ['items'] });
      void qc.invalidateQueries({ queryKey: queryKeys.approvalsPending });
    },
  });
}
