'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/auth.store';
import { Bell, Search } from 'lucide-react';
import api from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, setAuth, user, org, role } = useAuthStore();

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
          <div className="flex-1 flex items-center gap-3 max-w-lg">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              placeholder="Search leads, companies, campaigns..."
              className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
            </button>
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
