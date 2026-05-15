import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/workflows';
import { queryKeys } from '@/hooks/queryKeys';

export function useWorkflows(params: api.ListWorkflowsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.workflows(params as Record<string, unknown>),
    queryFn: () => api.listWorkflows(params),
    enabled: options?.enabled ?? true,
  });
}

export function useWorkflow(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: id ? queryKeys.workflow(id) : ['workflows', 'detail', 'idle'],
    queryFn: () => api.getWorkflow(id!),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: api.CreateWorkflowBody) => api.createWorkflow(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useCreateWorkflowVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { definition?: Record<string, unknown> } }) =>
      api.createWorkflowVersion(id, body),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: queryKeys.workflow(v.id) });
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function usePublishWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.PublishWorkflowBody }) => api.publishWorkflow(id, body),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: queryKeys.workflow(v.id) });
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
