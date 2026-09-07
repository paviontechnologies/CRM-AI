import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Button ───────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-onaccent hover:opacity-85',
  secondary: 'bg-surface text-ink border border-line hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-ink',
  danger: 'bg-red-600 text-onaccent hover:bg-red-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

// ─── Card ─────────────────────────────────────────────────────────────────

export function Card({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-surface border border-line rounded-xl', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 h-14 border-b border-line">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div className="min-w-0">
          <h3 className="font-medium text-ink text-sm truncate">{title}</h3>
          {subtitle && <p className="text-xs text-faint mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────

type BadgeTone = 'gray' | 'brand' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

/**
 * In a black-and-white system status is carried by *weight*, not hue: solid ink
 * reads as active, an outline as resolved, a soft fill as neutral. Red is the
 * one exception — an error that whispers is a bug.
 *
 * The tone names are kept so ~20 call sites don't have to be rewritten.
 */
const toneClasses: Record<BadgeTone, string> = {
  gray: 'bg-subtle text-muted',
  brand: 'bg-accent text-onaccent',
  green: 'border border-ink/25 text-ink',
  blue: 'bg-subtle text-ink',
  purple: 'bg-subtle text-ink',
  amber: 'border border-line text-muted',
  red: 'bg-red-50 text-red-700',
};

export function Badge({ tone = 'gray', children, className, dot }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', toneClasses[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
      {children}
    </span>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-semibold text-ink tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6 bg-surface border border-line rounded-xl">
      <div className="w-11 h-11 border border-line rounded-lg flex items-center justify-center mx-auto mb-4 text-faint">
        {icon}
      </div>
      <p className="text-ink font-medium">{title}</p>
      {description && <p className="text-muted text-sm mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-ink', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-6 h-6" />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

// ─── StatCard ─────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  /** Accepted for call-site compatibility; the palette is monochrome. */
  tone?: BadgeTone;
}) {
  return (
    <div className="bg-surface border border-line rounded-xl p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium tracking-[0.1em] uppercase text-faint">{label}</p>
        <span className="text-faint">{icon}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold text-ink tracking-tight tabular-nums">{value}</div>
      {hint && <div className="text-xs text-faint mt-1.5">{hint}</div>}
    </div>
  );
}
