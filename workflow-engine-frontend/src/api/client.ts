import axios, { type AxiosError } from 'axios';
import { useSessionStore } from '@/store/session';
import { errorEnvelopeSchema } from '@/api/schemas';

const rawBase =
  import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : '';

/** Base URL for API (defaults to same origin so Vite proxy can forward to backend). */
export const apiBaseURL = rawBase || '';

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
});

function shouldSkipTenantHeader(url: string) {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/health')
  );
}

apiClient.interceptors.request.use((config) => {
  const { token, tenantId } = useSessionStore.getState();
  const url = config.url ?? '';
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId && !shouldSkipTenantHeader(url)) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  return config;
});

export function getErrorMessage(err: unknown): string {
  const ax = err as AxiosError<unknown>;
  const data = ax.response?.data;
  const parsed = errorEnvelopeSchema.safeParse(data);
  if (parsed.success) return parsed.data.message;
  if (typeof data === 'object' && data && 'message' in data && typeof (data as { message: string }).message === 'string') {
    return (data as { message: string }).message;
  }
  return ax.message || 'Request failed';
}
