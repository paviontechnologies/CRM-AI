'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Landing page for the password-reset link Supabase emails out.
 *
 * The link carries a recovery session in the URL, which the Supabase client
 * picks up on load (detectSessionInUrl). From there setting a new password is
 * a normal authenticated update.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setError('This reset link is invalid or has expired. Request a new one.');
      setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Could not update the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-ink tracking-tight">Set a new password</h1>
      <p className="text-muted text-sm mt-1.5">Choose a password of at least 8 characters.</p>

      {done ? (
        <div className="mt-8 flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2.5 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Password updated. Taking you to sign in…</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">New password</label>
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
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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

          <button
            type="submit"
            disabled={saving || !ready}
            className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-onaccent font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted mt-8">
        <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
