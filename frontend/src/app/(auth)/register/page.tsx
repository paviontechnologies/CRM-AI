'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createApiSession } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (signUpError) throw signUpError;

      // With email confirmation enabled (Supabase's default) there is no
      // session yet — the workspace gets created on the first real sign-in.
      if (!data.session) {
        setConfirmSent(true);
        return;
      }

      const session = await createApiSession(companyName);
      if (!session) throw new Error('Could not start a session with the API.');

      setAuth(session.token, session.user, session.organization, session.role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="lg:hidden flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
          <span className="text-onaccent font-semibold text-sm">PT</span>
        </div>
        <span className="font-semibold text-ink">Pavion Technologies</span>
      </div>

      <h1 className="text-2xl font-semibold text-ink tracking-tight">Create your workspace</h1>
      <p className="text-muted text-sm mt-1.5">Free to start — no credit card required.</p>

      {!isSupabaseConfigured && (
        <div className="mt-6 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-2.5 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart the dev server.
          </span>
        </div>
      )}

      {confirmSent && (
        <div className="mt-6 flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2.5 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Confirmation email sent to <strong>{email}</strong>. Click the link in it, then sign in
            to finish setting up <strong>{companyName}</strong>.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Your name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="surface-input"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Company</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="surface-input"
              placeholder="Acme Corp"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Work email</label>
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
          <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="surface-input"
            placeholder="Min. 8 characters"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 px-3.5 py-2.5 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-onaccent font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Creating workspace…' : 'Create free workspace'}
        </button>
      </form>

      <p className="text-xs text-faint text-center mt-4">
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
      <p className="text-center text-sm text-muted mt-4 pt-4 border-t border-line">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
