import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const proof = [
  ['1–100', 'Intent score on every lead, with the reasoning attached'],
  ['4 steps', 'From raw list to booked meeting, without the spreadsheet'],
  ['One ask', 'The assistant scores, drafts and files — in your words'],
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Editorial panel. The old version leaned on gradient glows and a dot
          grid; a black field with type on it is quieter and ages better. */}
      <div className="hidden lg:flex w-[44%] xl:w-[40%] bg-field text-onfield flex-col justify-between p-12 relative">
        <Link href="/" className="flex items-center gap-3 relative">
          <span className="w-9 h-9 rounded-lg bg-onfield text-field grid place-items-center text-xs font-semibold tracking-tight">
            PT
          </span>
          <span className="font-semibold tracking-tight">Pavion</span>
        </Link>

        <div className="relative">
          <h2 className="text-4xl xl:text-[2.75rem] font-semibold leading-[1.08] tracking-tight max-w-md">
            Know which lead is worth the call.
          </h2>

          <div className="mt-12 space-y-px">
            {proof.map(([k, v]) => (
              <div key={k} className="flex gap-6 py-4 border-t border-onfield/15">
                <span className="text-sm font-medium tabular-nums w-20 flex-shrink-0 opacity-90">{k}</span>
                <span className="text-sm opacity-60 leading-relaxed">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs opacity-40">
          © {new Date().getFullYear()} Pavion Technologies
        </p>
      </div>

      {/* Form column */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-5 sm:px-8">
          <Link href="/" className="lg:hidden flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-md bg-accent text-onaccent grid place-items-center text-[11px] font-semibold">
              PT
            </span>
            <span className="font-semibold tracking-tight text-ink">Pavion</span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-16 sm:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
