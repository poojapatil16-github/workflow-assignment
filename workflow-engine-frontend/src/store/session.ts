import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SessionState = {
  token: string | null;
  tenantId: string | null;
  setToken: (token: string | null) => void;
  setTenantId: (tenantId: string | null) => void;
  logout: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      tenantId: null,
      setToken: (token) => set({ token }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () => set({ token: null, tenantId: null }),
    }),
    {
      name: 'workflow-engine-session',
      partialize: (s) => ({ token: s.token, tenantId: s.tenantId }),
    },
  ),
);
