'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotificationBell } from '@/components/layout/NotificationBell';
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 bg-white border-b flex items-center px-6 gap-4 flex-shrink-0">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3 max-w-lg">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by company, contact or email…"
              className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none placeholder-gray-400"
            />
          </form>
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
