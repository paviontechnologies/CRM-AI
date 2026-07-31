'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { useAuthStore } from '@/store/auth.store';
import { Search } from 'lucide-react';
import api from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, setAuth, user } = useAuthStore();
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/leads?search=${encodeURIComponent(search.trim())}`);
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    // Refresh user data on mount
    api
      .get('/auth/me')
      .then((res) => {
        const { user: u, organization, role: r, token: t } = res.data;
        if (u && organization) setAuth(t || token, u, organization, r);
      })
      .catch(() => {
        router.push('/login');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!token) return null;

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <form
            onSubmit={handleSearch}
            className="flex-1 flex items-center gap-2.5 max-w-md h-10 px-3.5 rounded-xl bg-slate-100/70 border border-transparent focus-within:bg-white focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_var(--color-brand-100)] transition-all"
          >
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="flex-1 text-sm text-slate-700 bg-transparent focus:outline-none placeholder-slate-400"
            />
            <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded">↵</kbd>
          </form>
          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell />
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <AssistantWidget />
    </div>
  );
}
