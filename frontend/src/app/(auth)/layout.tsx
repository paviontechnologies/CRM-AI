import { Sparkles, Target, Bot, TrendingUp } from 'lucide-react';

const highlights = [
  { icon: Bot, title: 'AI that takes action', desc: 'Score leads, draft outreach and update your pipeline by just asking.' },
  { icon: Target, title: 'Intent scoring built in', desc: 'Every lead ranked on buying intent and ICP fit, automatically.' },
  { icon: TrendingUp, title: 'Close the loop', desc: 'Sequences, tasks and deals in one place — from first touch to won.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[46%] xl:w-[42%] relative overflow-hidden bg-slate-950 flex-col justify-between p-12">
        {/* Ambient brand glow + dot grid */}
        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            background:
              'radial-gradient(600px circle at 20% 15%, rgba(79,70,229,0.35), transparent 45%), radial-gradient(500px circle at 85% 80%, rgba(99,102,241,0.22), transparent 40%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-[var(--shadow-brand)]">
              <span className="text-white font-bold tracking-tight">PT</span>
            </div>
            <span className="text-white font-semibold text-lg">Pavion Technologies</span>
          </div>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-200 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI-native CRM
          </div>
          <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
            Find, score and close
            <br />
            your best B2B leads.
          </h2>
          <p className="text-slate-400 mt-4 max-w-md leading-relaxed">
            The lead intelligence platform that does the busywork — so your team spends its time selling.
          </p>

          <div className="mt-10 space-y-5">
            {highlights.map((h) => (
              <div key={h.title} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <h.icon className="w-4 h-4 text-brand-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{h.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5 max-w-sm">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-slate-500 text-xs">
          © {new Date().getFullYear()} Pavion Technologies · Lead Intelligence
        </div>
      </div>

      {/* Form column */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
