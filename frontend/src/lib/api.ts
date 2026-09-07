import axios from 'axios';
import { supabase, supabaseAccessToken } from './supabase';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Trade the current Supabase session for a CRM API token.
 *
 * The API token carries userId/orgId/role, so every request authenticates with
 * a single HMAC and no database lookup. It is minted once per session rather
 * than per request — Supabase keeps its own session alive in the background,
 * so an expired API token just needs this exchange again.
 */
export interface ApiSession {
  token: string;
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  organization: { id: string; name: string; slug: string } | null;
  role: string;
}

export const createApiSession = async (companyName?: string): Promise<ApiSession | null> => {
  const accessToken = await supabaseAccessToken();
  if (!accessToken) return null;

  const res = await axios.post<ApiSession>(
    `${api.defaults.baseURL}/auth/session`,
    companyName ? { companyName } : {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.data?.token) localStorage.setItem('token', res.data.token);
  return res.data ?? null;
};

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes('/auth/session') || original?.url?.includes('/auth/dev-login');

    if (error.response?.status === 401 && typeof window !== 'undefined' && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      // One in-flight exchange at a time, so a burst of 401s doesn't fan out.
      refreshPromise = refreshPromise || createApiSession()
        .then((s) => s?.token ?? null)
        .catch(() => null);
      const token = await refreshPromise;
      refreshPromise = null;

      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }

      localStorage.removeItem('token');
      await supabase.auth.signOut().catch(() => {});
      window.location.href = '/login';
    } else if (error.response?.status === 401 && typeof window !== 'undefined' && !isAuthRoute) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
