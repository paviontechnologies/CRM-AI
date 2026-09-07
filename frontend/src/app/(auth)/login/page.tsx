'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api, { createApiSession } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const devBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

  // Completes a sign-in that started elsewhere: an OAuth redirect back to this
  // page, or a still-valid Supabase session whose API token has expired.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      try {
        const session = await createApiSession();
        if (cancelled || !session) return;
        setAuth(session.token, session.user, session.organization, session.role);
        router.push('/dashboard');
      } catch {
        // Leave the form up — the user can sign in normally.
      }
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // Supabase proves who you are; the API decides which workspace that is.
      const session = await createApiSession();
      if (!session) throw new Error('Could not start a session with the API.');

      setAuth(session.token, session.user, session.organization, session.role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (oauthError) setError(oauthError.message);
  };

  const handleForgot = async () => {
    if (!email) {
      setError('Enter your email first, then tap Forgot.');
      return;
    }
    setError('');
    setNotice('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) setError(resetError.message);
    else setNotice(`Password reset link sent to ${email}.`);
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/dev-login');
      const { token, user, organization, role } = res.data;
      setAuth(token, user, organization, role ?? 'ADMIN');
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.status === 404
          ? 'Dev bypass is off — set DEV_AUTH_BYPASS=true on the API and restart it.'
          : err.response?.data?.error || 'Dev bypass failed. Is the API running?'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
          <span className="text-onaccent font-semibold text-sm">PT</span>
        </div>
        <span className="font-semibold text-ink">Pavion Technologies</span>
      </div>

      <h1 className="text-2xl font-semibold text-ink tracking-tight">Welcome back</h1>
      <p className="text-muted text-sm mt-1.5">Sign in to your workspace to continue.</p>

      {!isSupabaseConfigured && (
        <div className="mt-6 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-2.5 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart the dev server.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="surface-input"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-ink">Password</label>
            <button
              type="button"
              onClick={handleForgot}
              className="text-xs text-brand-600 font-medium hover:text-brand-700"
            >
              Forgot?
            </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="surface-input"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 px-3.5 py-2.5 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2.5 rounded-xl text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-onaccent font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full h-11 bg-surface hover:bg-subtle text-ink font-medium rounded-xl transition-colors text-sm border border-line"
        >
          Continue with Google
        </button>

        {devBypass && (
          <button
            type="button"
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full h-11 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium rounded-xl transition-colors text-sm border border-amber-200 disabled:opacity-60"
          >
            Skip login (dev)
          </button>
        )}
      </form>

      <p className="text-center text-sm text-muted mt-8">
        New to Pavion?{' '}
        <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700">
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
