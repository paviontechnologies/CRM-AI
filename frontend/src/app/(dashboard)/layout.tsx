'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { ThemeToggle } from '@/components/ThemeToggle';
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
        <header className="h-14 bg-canvas/85 backdrop-blur-md border-b border-line flex items-center px-5 gap-3 flex-shrink-0">
          <form
            onSubmit={handleSearch}
            className="flex-1 flex items-center gap-2.5 max-w-sm h-9 px-3 rounded-lg border border-line bg-surface focus-within:border-ink transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-faint flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads"
              className="flex-1 text-sm text-ink bg-transparent focus:outline-none placeholder-faint"
            />
            <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-faint border border-line rounded">
              ↵
            </kbd>
          </form>
          <div className="flex items-center gap-1.5 ml-auto">
            <ThemeToggle />
            <NotificationBell />
            <span className="w-8 h-8 rounded-full bg-accent text-onaccent grid place-items-center text-xs font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <AssistantWidget />
    </div>
  );
}
