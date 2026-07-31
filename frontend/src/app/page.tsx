import Link from 'next/link';
import {
  Target, Mail, Bot, GitBranch, BarChart3, LayoutTemplate,
  Check, ArrowRight, Sparkles,
} from 'lucide-react';

const features = [
  { icon: Target, title: 'AI intent scoring', desc: 'Every lead ranked 1–100 on buying intent, ICP fit, urgency and budget — automatically.' },
  { icon: Mail, title: 'Personalized outreach', desc: 'Generate cold emails, WhatsApp and LinkedIn messages tailored to each lead in a click.' },
  { icon: Bot, title: 'An assistant that acts', desc: 'Ask in plain language — the AI scores leads, drafts outreach and updates your pipeline for you.' },
  { icon: GitBranch, title: 'Visual pipeline', desc: 'Drag-and-drop kanban tracking every deal from first touch to closed won.' },
  { icon: BarChart3, title: 'Analytics that matter', desc: 'Conversion, reply rates and pipeline value in real time, in clean dashboards.' },
  { icon: LayoutTemplate, title: 'Niche templates', desc: 'Pre-built qualification workflows for hospitals, restaurants, ERP buyers and more.' },
];

const steps = [
  { step: '1', title: 'Import or generate', desc: 'Add leads manually, import a CSV, or let the AI find them.' },
  { step: '2', title: 'AI scores intent', desc: 'Each lead is analysed and assigned a buying-intent score.' },
  { step: '3', title: 'Generate outreach', desc: 'AI writes personalized messages for every prospect.' },
  { step: '4', title: 'Track & close', desc: 'Move deals through the pipeline and close more, faster.' },
];

const plans = [
  { name: 'Free', price: '$0', leads: '100 leads', ai: '50 AI credits', emails: '500 emails', popular: false },
  { name: 'Starter', price: '$49', leads: '1,000 leads', ai: '500 AI credits', emails: '5,000 emails', popular: false },
  { name: 'Growth', price: '$149', leads: '5,000 leads', ai: '2,000 AI credits', emails: '20,000 emails', popular: true },
  { name: 'Agency', price: '$399', leads: 'Unlimited', ai: 'Unlimited AI', emails: 'Unlimited', popular: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 sm:px-8 h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-[var(--shadow-brand)]">
            <span className="text-white font-bold text-sm">PT</span>
          </div>
          <span className="font-semibold text-slate-900">Pavion</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-[var(--shadow-brand)]">
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(700px circle at 50% -10%, rgba(79,70,229,0.10), transparent 60%)' }}
        />
        <div className="max-w-5xl mx-auto px-6 sm:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3.5 py-1.5 rounded-full text-sm font-medium mb-8 border border-brand-100">
            <Sparkles className="w-3.5 h-3.5" />
            AI-native CRM for B2B sales
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-[1.05] tracking-tight mb-6">
            Find, score &amp; close
            <br />
            <span className="text-brand-600">B2B leads with AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Import leads, score buying intent, generate personalized outreach and automate follow-ups —
            with an AI assistant that does the busywork for you.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/register" className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 shadow-[var(--shadow-brand)] transition-colors">
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="px-7 py-3.5 bg-white text-slate-800 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              View demo
            </Link>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 100 free leads</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 2-minute setup</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">Everything you need to close more deals</h2>
          <p className="text-slate-500 text-lg">One platform for the entire B2B sales motion.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="p-6 border border-slate-200 rounded-2xl hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all group bg-white">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-100 py-24">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">How it works</h2>
            <p className="text-slate-500 text-lg">From zero to closed deal in four steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center text-white font-semibold mx-auto mb-4 shadow-[var(--shadow-brand)]">
                  {s.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">Simple, transparent pricing</h2>
          <p className="text-slate-500 mb-14 text-lg">Start free. Scale as you grow. No hidden fees.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`bg-white p-6 rounded-2xl border relative text-left transition-all ${
                  p.popular ? 'border-brand-300 shadow-[var(--shadow-elevated)] md:scale-105' : 'border-slate-200 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-[var(--shadow-brand)]">
                    Most popular
                  </div>
                )}
                <div className="font-semibold text-slate-500 text-sm mb-2">{p.name}</div>
                <div className="text-4xl font-bold text-slate-900 mb-1 tracking-tight">
                  {p.price}
                  <span className="text-base font-normal text-slate-400">/mo</span>
                </div>
                <div className="space-y-2.5 mt-5 text-sm text-slate-600">
                  {[p.leads, p.ai, p.emails, 'Full CRM pipeline', 'Campaign automation'].map((line) => (
                    <div key={line} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {line}
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className={`block mt-6 py-2.5 font-semibold rounded-xl text-sm text-center transition-colors ${
                    p.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 sm:px-8 pb-24">
        <div className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl bg-slate-950 px-8 py-16 text-center">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(500px circle at 30% 0%, rgba(79,70,229,0.4), transparent 45%), radial-gradient(400px circle at 100% 100%, rgba(139,92,246,0.25), transparent 45%)' }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">Ready to close more deals?</h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
              Join sales teams using AI to find, score and close their best-fit customers.
            </p>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
              Start free — no card required <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100">
        © {new Date().getFullYear()} Pavion Technologies · Lead Intelligence
      </footer>
    </div>
  );
}
