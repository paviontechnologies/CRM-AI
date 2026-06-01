'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  Activity,
  Target,
  UserCheck,
  Shield,
  ChevronRight,
  LogOut,
  GitBranch,
  Zap,
  Globe,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Lead Explorer', href: '/leads', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
  { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
  { name: 'AI Templates', href: '/ai-templates', icon: Target },
  { name: 'Analytics', href: '/analytics', icon: Activity },
  { name: 'Team', href: '/team', icon: UserCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, org, role, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen flex-col bg-gray-950 w-64 flex-shrink-0">
      {/* Pavion Branding */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
            <span className="text-white font-black text-sm">PT</span>
          </div>
          <div className="min-w-0">
            <div className="text-white font-black text-sm leading-none">Pavion Technologies</div>
            <div className="text-blue-400 text-xs mt-0.5 font-medium">Lead Intelligence</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
        {role === 'SUPERADMIN' && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname.startsWith('/admin')
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            Admin Panel
            {pathname.startsWith('/admin') && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
          </Link>
        )}
      </nav>

      {/* Company website link */}
      <div className="px-4 pb-3">
        <a
          href="https://paviontechnologies.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all"
        >
          <Globe className="w-3.5 h-3.5" />
          paviontechnologies.com
        </a>
      </div>

      {/* Quick generate leads button */}
      <div className="px-4 pb-3">
        <Link
          href="/leads"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold rounded-xl transition-opacity shadow-lg shadow-blue-900/40"
        >
          <Zap className="w-3.5 h-3.5" />
          Generate New Leads
        </Link>
      </div>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.name || user?.email}</div>
            <div className="text-gray-500 text-xs truncate capitalize">{role?.toLowerCase()}</div>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
