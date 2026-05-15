import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/approvals';
import { queryKeys } from '@/hooks/queryKeys';

export function usePendingApprovals() {
  return useQuery({
    queryKey: queryKeys.approvalsPending,
    queryFn: () => api.listPendingApprovals(),
    refetchInterval: 30_000,
  });
}

export function useApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: api.ApprovalDecisionBody }) => api.approveApproval(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.approvalsPending });
      void qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: api.ApprovalDecisionBody }) => api.rejectApproval(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.approvalsPending });
    },
  });
}
