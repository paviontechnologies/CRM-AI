import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Auth client.
 *
 * Supabase is the identity provider only — no application data lives there.
 * It owns signup, sign-in, password resets and OAuth, and keeps the session
 * refreshed in the background; the CRM API is handed the resulting token once
 * per session and issues its own from it (see `mintApiToken` in lib/api.ts).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Placeholder values keep `createClient` from throwing at import time when the
// project is not configured yet — the login page checks `isSupabaseConfigured`
// and explains what is missing instead of failing with a stack trace.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** The current Supabase access token, or null when signed out. */
export const supabaseAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};
