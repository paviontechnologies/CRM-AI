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
  LogOut,
  GitBranch,
  ListTodo,
  CreditCard,
  Bot,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/cn';

type NavItem = { name: string; href: string; icon: typeof LayoutDashboard };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Tasks', href: '/tasks', icon: ListTodo },
      { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
    ],
  },
  {
    label: 'Growth',
    items: [
      { name: 'Campaigns', href: '/campaigns', icon: Mail },
      { name: 'AI Templates', href: '/ai-templates', icon: Target },
      { name: 'AI Qualification', href: '/workflows', icon: Bot },
      { name: 'Analytics', href: '/analytics', icon: Activity },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Team', href: '/team', icon: UserCheck },
      { name: 'Billing', href: '/billing', icon: CreditCard },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, org, role, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
        )}
      >
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brand-400" />}
        <item.icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', active ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
        {item.name}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen flex-col bg-slate-950 w-64 flex-shrink-0 border-r border-white/5">
      {/* Brand */}
      <div className="px-5 h-16 flex items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-brand)]">
            <span className="text-white font-bold text-sm tracking-tight">PT</span>
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm leading-tight truncate">
              {org?.name || 'Pavion'}
            </div>
            <div className="text-slate-500 text-xs">Lead Intelligence</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}

        {role === 'SUPERADMIN' && (
          <div className="mb-5">
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Admin
            </div>
            <Link
              href="/admin"
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive('/admin') ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              )}
            >
              {isActive('/admin') && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-purple-400" />}
              <Shield className={cn('w-4 h-4', isActive('/admin') ? 'text-purple-300' : 'text-slate-500 group-hover:text-slate-300')} />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>

      {/* Quick action */}
      <div className="px-3 pb-3">
        <Link
          href="/leads"
          className="flex items-center justify-center gap-2 w-full h-10 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-[var(--shadow-brand)]"
        >
          <Sparkles className="w-4 h-4" />
          Generate Leads
        </Link>
      </div>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.name || user?.email}</div>
            <div className="text-slate-500 text-xs truncate capitalize">{role?.toLowerCase() || 'member'}</div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
