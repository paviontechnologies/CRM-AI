import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">AI</span>
          </div>
          <span className="font-black text-xl text-gray-900">AI Lead Gen</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-blue-100">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse inline-block"></span>
          AI-powered B2B Lead Generation
        </div>
        <h1 className="text-6xl font-black text-gray-900 leading-tight mb-6">
          Find, Score &amp; Close<br />
          <span className="text-blue-600">B2B Leads with AI</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Import leads, score buying intent with AI, generate personalized outreach, and automate follow-ups — all in one platform.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
            Start Free Trial
          </Link>
          <Link href="/login" className="px-8 py-4 bg-gray-50 text-gray-800 font-bold rounded-xl text-lg border border-gray-200 hover:bg-gray-100 transition-all">
            View Demo
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-400">
          <span>✓ No credit card required</span>
          <span>✓ 100 free leads</span>
          <span>✓ Setup in 2 minutes</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Everything you need to close more deals</h2>
          <p className="text-gray-500 text-lg">One platform for the entire B2B sales process</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🎯', title: 'AI Intent Scoring', desc: 'Score leads 1-100 on buying intent, ICP fit, urgency and budget potential using advanced AI models.' },
            { icon: '✉️', title: 'Personalized Outreach', desc: 'Generate cold emails, WhatsApp messages, LinkedIn DMs tailored to each lead automatically.' },
            { icon: '🤖', title: 'Campaign Automation', desc: 'Automate multi-day sequences with smart conditions and branching logic.' },
            { icon: '📊', title: 'CRM Pipeline', desc: 'Visual kanban pipeline tracking every deal from New Lead to Closed Won.' },
            { icon: '📈', title: 'Analytics Dashboard', desc: 'Track conversion rates, reply rates, and SDR performance in real-time with rich charts.' },
            { icon: '🏥', title: 'Niche Templates', desc: 'Pre-built AI workflows for hospitals, clinics, restaurants, ERP buyers, and more.' },
          ].map((f) => (
            <div key={f.title} className="p-6 border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-lg transition-all group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">How it works</h2>
            <p className="text-gray-500">From zero to closed deal in 4 steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Import Leads', desc: 'Add leads manually, import CSV, or use our enrichment engine.' },
              { step: '2', title: 'AI Scores Intent', desc: 'Our AI analyzes each lead and assigns a buying intent score.' },
              { step: '3', title: 'Generate Outreach', desc: 'AI writes personalized emails and messages for each prospect.' },
              { step: '4', title: 'Track & Close', desc: 'Monitor responses, move deals through your pipeline, close.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="py-24">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 mb-12">Start free. Scale as you grow. No hidden fees.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { name: 'Free', price: '$0', leads: '100 leads', ai: '50 AI credits', emails: '500 emails', color: 'border-gray-200', popular: false },
              { name: 'Starter', price: '$49', leads: '1,000 leads', ai: '500 AI credits', emails: '5,000 emails', color: 'border-blue-200', popular: false },
              { name: 'Growth', price: '$149', leads: '5,000 leads', ai: '2,000 AI credits', emails: '20,000 emails', color: 'border-indigo-200', popular: true },
              { name: 'Agency', price: '$399', leads: 'Unlimited', ai: 'Unlimited AI', emails: 'Unlimited', color: 'border-purple-200', popular: false },
            ].map((p) => (
              <div key={p.name} className={`bg-white p-6 rounded-2xl border-2 ${p.color} relative ${p.popular ? 'shadow-xl scale-105' : 'shadow-sm'} transition-all hover:shadow-lg`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div className="font-bold text-gray-500 text-sm mb-2">{p.name}</div>
                <div className="text-4xl font-black text-gray-900 mb-1">
                  {p.price}
                  <span className="text-base font-normal text-gray-400">/mo</span>
                </div>
                <div className="space-y-2 mt-4 text-sm text-gray-600 text-left">
                  <div className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> {p.leads}</div>
                  <div className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> {p.ai}</div>
                  <div className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> {p.emails}</div>
                  <div className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Full CRM pipeline</div>
                  <div className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Campaign automation</div>
                </div>
                <Link
                  href="/register"
                  className={`block mt-6 py-2.5 font-semibold rounded-xl text-sm text-center transition-colors ${p.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 py-20">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to supercharge your sales?</h2>
          <p className="text-blue-100 text-lg mb-8">Join thousands of sales teams closing more deals with AI.</p>
          <Link href="/register" className="inline-block px-10 py-4 bg-white text-blue-600 font-black rounded-xl text-lg hover:bg-blue-50 shadow-2xl transition-all">
            Start Free — No Card Required
          </Link>
        </div>
      </div>

      <footer className="py-8 text-center text-gray-400 text-sm border-t border-gray-100">
        © 2025 AI Lead Gen SaaS. Built for modern sales teams.
      </footer>
    </div>
  );
}
