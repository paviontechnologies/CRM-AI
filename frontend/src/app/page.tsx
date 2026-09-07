import Link from 'next/link';
import { ArrowRight, Check, Sparkle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Reveal } from '@/components/motion/Reveal';
import { HeroQueue } from '@/components/marketing/HeroQueue';
import { HeroBackdrop } from '@/components/marketing/HeroBackdrop';

const stats = [
  ['1–100', 'Intent score per lead'],
  ['4', 'Steps from list to meeting'],
  ['0', 'Spreadsheets required'],
  ['24/7', 'Sequences that keep running'],
];

const capabilities = [
  {
    label: 'Scoring',
    title: 'Intent, ranked',
    desc: 'Every lead scored on buying intent, ICP fit, urgency and budget — with the reasoning attached, so you can argue with it.',
  },
  {
    label: 'Outreach',
    title: 'Written for one reader',
    desc: 'Cold emails and LinkedIn notes drafted per prospect from what you actually know: industry, size, city, your own notes.',
  },
  {
    label: 'Assistant',
    title: 'Asks nothing twice',
    desc: 'Say what you want in a sentence. It searches, scores, drafts, files notes and moves deals — scoped to your workspace and role.',
  },
  {
    label: 'Pipeline',
    title: 'Drag, drop, done',
    desc: 'A board that tracks every deal from first touch to closed won, with stage values that add up in real time.',
  },
  {
    label: 'Sequences',
    title: 'Follow-up that follows through',
    desc: 'Multi-step campaigns with per-step day offsets. A reply stops the sequence — nobody gets nudged after they answer.',
  },
  {
    label: 'Analytics',
    title: 'Numbers, not a mood board',
    desc: 'Conversion by source and stage, reply rates, pipeline value. Enough to change what you do on Monday morning.',
  },
];

const steps = [
  { n: '01', title: 'Bring your leads', desc: 'Add them by hand, import a CSV, or describe a niche and let the model find them.' },
  { n: '02', title: 'Let it score', desc: 'Each lead is analysed and ranked, so the list sorts itself by who is worth calling.' },
  { n: '03', title: 'Send something human', desc: 'Generate outreach per prospect, edit what you like, enroll them in a sequence.' },
  { n: '04', title: 'Close', desc: 'Move deals across the board. The history writes itself as you go.' },
];

const plans = [
  { name: 'Free', price: '0', note: 'To try it properly', items: ['100 leads', '50 AI credits', '500 emails', '2 seats'] },
  { name: 'Starter', price: '49', note: 'For a founder selling', items: ['1,000 leads', '500 AI credits', '5,000 emails', '5 seats'] },
  { name: 'Growth', price: '149', note: 'For a team with a number', items: ['5,000 leads', '2,000 AI credits', '25,000 emails', '15 seats'], featured: true },
  { name: 'Agency', price: '399', note: 'For running many books', items: ['Unlimited leads', 'Unlimited AI', 'Unlimited emails', 'Unlimited seats'] },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-md bg-accent text-onaccent grid place-items-center text-[11px] font-semibold tracking-tight">
        PT
      </span>
      <span className="font-semibold tracking-tight text-ink">Pavion</span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <nav className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/login" className="px-3 h-9 inline-flex items-center text-sm text-muted hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 h-9 inline-flex items-center gap-1.5 bg-accent text-onaccent text-sm font-medium rounded-lg hover:bg-accent-hi transition-colors"
            >
              Start free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <HeroBackdrop />
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-16 sm:pt-24 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            <div className="lg:col-span-6">
              <Reveal>
                <span className="inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-full border border-accent-line bg-accent-soft text-accent text-xs font-medium">
                  <Sparkle className="w-3 h-3" />
                </span>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="mt-6 text-[2.75rem] leading-[1.04] sm:text-[3.5rem] sm:leading-[1.02] font-semibold text-ink">
                  Know which lead is
                  <br />
                  <span className="text-accent">worth the call.</span>
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-6 text-lg text-muted max-w-xl leading-relaxed">
                  Pavion scores every prospect on real buying signals, drafts the outreach,
                  runs the follow-up and keeps the pipeline honest — so your day starts with a
                  ranked list instead of a spreadsheet.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href="/register"
                    className="h-11 px-5 inline-flex items-center gap-2 bg-accent text-onaccent text-sm font-medium rounded-lg hover:bg-accent-hi transition-colors"
                  >
                    Create a workspace <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="h-11 px-5 inline-flex items-center text-sm font-medium text-ink border border-line rounded-lg hover:bg-subtle transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
                <p className="mt-4 text-sm text-faint">Free tier, no card. Upgrade when it earns it.</p>
              </Reveal>
            </div>

            <div className="lg:col-span-6">
              <HeroQueue />
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-line bg-surface">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
          {stats.map(([v, l], i) => (
            <Reveal key={l} delay={i * 0.06} className="px-6 py-8">
              <p className="text-3xl font-semibold text-ink tracking-tight tabular-nums">{v}</p>
              <p className="mt-1 text-sm text-muted">{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-semibold text-ink max-w-xl leading-tight">
            Everything between a name and a signature.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((c, i) => (
            <Reveal key={c.title} delay={(i % 3) * 0.07}>
              <div className="group h-full rounded-xl border border-line bg-surface p-7 transition-all hover:border-accent-line hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-accent">{c.label}</p>
                <h3 className="mt-3 text-lg font-semibold text-ink">{c.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{c.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-line bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-semibold text-ink max-w-lg leading-tight">
              Four steps, and the busywork is gone.
            </h2>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="border-t-2 border-accent pt-5">
                  <span className="text-xs font-medium tabular-nums text-accent">{s.n}</span>
                  <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-line">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
              <h2 className="text-3xl sm:text-4xl font-semibold text-ink leading-tight">Pricing</h2>
              <p className="text-sm text-muted max-w-sm">
                Every plan includes the assistant, the pipeline and the analytics. The tiers
                only change how much you can run through them.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.07}>
                <div
                  className={`h-full p-7 flex flex-col rounded-xl border transition-all hover:-translate-y-0.5 ${
                    p.featured
                      ? 'bg-accent text-onaccent border-accent shadow-[var(--shadow-elevated)]'
                      : 'bg-surface border-line hover:border-accent-line'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className={`font-semibold ${p.featured ? '' : 'text-ink'}`}>{p.name}</h3>
                    {p.featured && (
                      <span className="text-[10px] font-medium tracking-[0.12em] uppercase opacity-75">Popular</span>
                    )}
                  </div>
                  <p className={`mt-1 text-xs ${p.featured ? 'opacity-75' : 'text-faint'}`}>{p.note}</p>

                  <p className="mt-6 flex items-baseline gap-1">
                    <span className={`text-sm ${p.featured ? 'opacity-75' : 'text-faint'}`}>$</span>
                    <span className={`text-4xl font-semibold tabular-nums ${p.featured ? '' : 'text-ink'}`}>{p.price}</span>
                    <span className={`text-sm ${p.featured ? 'opacity-75' : 'text-faint'}`}>/mo</span>
                  </p>

                  <ul className="mt-6 space-y-2.5 flex-1">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-sm">
                        <Check className={`w-3.5 h-3.5 flex-shrink-0 ${p.featured ? 'opacity-75' : 'text-accent'}`} />
                        <span className={p.featured ? 'opacity-90' : 'text-muted'}>{it}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`mt-7 h-10 inline-flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                      p.featured
                        ? 'bg-onaccent text-accent hover:opacity-90'
                        : 'border border-line text-ink hover:bg-subtle'
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-line bg-field text-onfield">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-5xl font-semibold leading-[1.08] max-w-2xl mx-auto">
              Start with a hundred leads.
              <br />
              Keep the ones that answer.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link
              href="/register"
              className="mt-10 h-11 px-6 inline-flex items-center gap-2 bg-accent text-onaccent text-sm font-medium rounded-lg hover:bg-accent-hi transition-colors"
            >
              Create a workspace <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-6 h-16 flex flex-wrap items-center justify-between gap-4">
          <Wordmark />
          <p className="text-xs text-faint">© {new Date().getFullYear()} Pavion Technologies</p>
        </div>
      </footer>
    </div>
  );
}
