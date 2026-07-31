'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user, organization, role } = res.data;
      setAuth(token, user, organization, role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-[var(--shadow-brand)]">
          <span className="text-white font-bold text-sm">PT</span>
        </div>
        <span className="font-semibold text-slate-900">Pavion Technologies</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
      <p className="text-slate-500 text-sm mt-1.5">Sign in to your workspace to continue.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
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
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <button type="button" className="text-xs text-brand-600 font-medium hover:text-brand-700">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-[var(--shadow-brand)] flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setEmail('admin@demo.com');
            setPassword('Demo1234!');
          }}
          className="w-full h-11 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl transition-colors text-sm border border-slate-200"
        >
          Use demo account
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-8">
        New to Pavion?{' '}
        <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700">
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
