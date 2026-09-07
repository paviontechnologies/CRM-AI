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
      { name: 'Templates', href: '/ai-templates', icon: Target },
      { name: 'Qualification', href: '/workflows', icon: Bot },
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
          'group relative flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-colors',
          active ? 'bg-subtle text-ink font-medium' : 'text-muted hover:text-ink hover:bg-subtle/60'
        )}
      >
        {/* The active marker is a rule, not a pill — it reads as a position in
            a list rather than a floating chip. */}
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-ink" />}
        <item.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-ink' : 'text-faint group-hover:text-muted')} />
        {item.name}
      </Link>
    );
  };

  const Group = ({ label, items }: { label: string; items: NavItem[] }) => (
    <div className="mb-6">
      <div className="px-3 mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    </div>
  );

  return (
    <aside className="flex h-screen flex-col bg-surface w-60 flex-shrink-0 border-r border-line">
      <div className="px-4 h-14 flex items-center border-b border-line">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-md bg-accent text-onaccent grid place-items-center text-[11px] font-semibold flex-shrink-0">
            PT
          </span>
          <span className="font-medium text-sm text-ink truncate">{org?.name || 'Pavion'}</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        {groups.map((group) => (
          <Group key={group.label} {...group} />
        ))}

        {role === 'SUPERADMIN' && (
          <Group label="Admin" items={[{ name: 'Superadmin', href: '/admin', icon: Shield }]} />
        )}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="w-7 h-7 rounded-full bg-subtle border border-line grid place-items-center text-[11px] font-medium text-ink flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-faint truncate">{role?.toLowerCase() || 'member'}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="w-7 h-7 grid place-items-center rounded-md text-faint hover:text-ink hover:bg-subtle transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
