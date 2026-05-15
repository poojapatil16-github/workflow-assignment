import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/auth';
import { queryKeys } from '@/hooks/queryKeys';
import { useSessionStore } from '@/store/session';

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.fetchMe(),
    enabled: enabled && !!useSessionStore.getState().token,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const setToken = useSessionStore((s) => s.setToken);
  return useMutation({
    mutationFn: (body: api.LoginBody) => api.login(body),
    onSuccess: (data) => {
      setToken(data.token);
      void qc.invalidateQueries({ queryKey: queryKeys.me });
      void qc.invalidateQueries({ queryKey: queryKeys.tenants });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const setToken = useSessionStore((s) => s.setToken);
  return useMutation({
    mutationFn: (body: api.RegisterBody) => api.register(body),
    onSuccess: (data) => {
      setToken(data.token);
      void qc.invalidateQueries({ queryKey: queryKeys.me });
      void qc.invalidateQueries({ queryKey: queryKeys.tenants });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const logout = useSessionStore((s) => s.logout);
  return () => {
    logout();
    void qc.clear();
  };
}
