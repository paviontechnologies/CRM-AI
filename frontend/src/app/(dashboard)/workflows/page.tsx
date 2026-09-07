'use client';

import { useState, useEffect } from 'react';
import { Save, Play, Bot, Sparkles, Check, X } from 'lucide-react';
import api from '@/lib/api';

const PRESETS = [
  {
    name: 'Hospital / HMS',
    prompt: `Score hospitals on their readiness to buy a Hospital Management System.

Weight these signals heavily:
- Mentions of "paperless", "digital records" or "EMR" → strong intent
- An outdated or third-party patient portal → strong intent
- 100+ beds or multi-branch operations → higher budget score
- Government/trust-run hospitals → longer sales cycle, lower urgency`,
  },
  {
    name: 'Restaurant / QR',
    prompt: `Score restaurants on their readiness to buy a QR-ordering and POS product.

Weight these signals heavily:
- Multiple outlets or a visible expansion plan → higher budget score
- Currently using paper menus or a basic third-party aggregator only → strong intent
- Active on food delivery platforms → already digital-comfortable, faster close
- Single-owner small cafes → lower budget score`,
  },
  {
    name: 'SaaS / CRM',
    prompt: `Score SaaS companies on their readiness to buy a CRM.

Weight these signals heavily:
- A sales team of 5+ → strong intent
- Recent funding round → high budget score
- Job postings for SDR/AE roles → high urgency
- Pre-revenue or founder-led sales only → lower urgency`,
  },
  {
    name: 'Logistics / ERP',
    prompt: `Score logistics companies on their readiness to buy an ERP.

Weight these signals heavily:
- Fleet size above 20 vehicles → higher budget score
- Manual dispatch or spreadsheet-based tracking → strong intent
- Multi-city operations → high urgency
- Pure broker model with no owned assets → lower fit`,
  },
];

export default function WorkflowsPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [testCompany, setTestCompany] = useState('Apollo Healthcare');
  const [testIndustry, setTestIndustry] = useState('Healthcare');
  const [testCity, setTestCity] = useState('Bengaluru');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setPrompt(res.data.organization?.aiQualificationPrompt || ''))
      .catch(() => setError('Could not load your current configuration'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch('/auth/org', { aiQualificationPrompt: prompt });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(
        err.response?.status === 403
          ? 'Only admins can change the qualification prompt'
          : err.response?.data?.error || 'Could not save'
      );
    } finally {
      setSaving(false);
    }
  };

  // Scores a throwaway company through the same AI path a real lead uses, so the
  // preview reflects the saved prompt rather than the text currently in the box.
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError('');
    try {
      const res = await api.post('/leads/outreach/preview', {
        companyName: testCompany,
        industry: testIndustry,
        city: testCity,
        channel: 'email',
      });
      setTestResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Test run failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">AI Qualification</h1>
          <p className="text-sm text-muted mt-1">
            Tell the AI what a good lead looks like for you. These instructions are applied every
            time a lead is scored.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 ${
            saved ? 'bg-green-600 text-onaccent' : 'bg-brand-600 hover:bg-brand-700 text-onaccent'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden h-fit">
          <div className="px-4 py-3 border-b bg-subtle">
            <h3 className="font-semibold text-sm text-ink">Starting points</h3>
          </div>
          <div className="p-2 space-y-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setPrompt(preset.prompt)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg text-muted hover:bg-brand-50 hover:text-brand-700 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <p className="px-4 pb-4 pt-1 text-xs text-faint">
            Picking one replaces the editor contents. Nothing is saved until you hit Save.
          </p>
        </div>

        <div className="bg-surface border border-line rounded-2xl shadow-sm">
          <div className="p-5 border-b flex items-center gap-3">
            <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-ink">Qualification instructions</h2>
              <p className="text-xs text-muted">Applied on every AI lead score for your org</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Score hospitals higher when they mention paperless records or run 100+ beds…"
              className="w-full text-sm font-mono bg-subtle border border-line rounded-xl p-4 h-64 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-faint -mt-3">
              Leave empty to use the default generic B2B scoring.
            </p>

            <div className="border-t pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <h3 className="font-semibold text-sm text-ink">Try it on a sample company</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={testCompany}
                  onChange={(e) => setTestCompany(e.target.value)}
                  placeholder="Company"
                  className="px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  value={testIndustry}
                  onChange={(e) => setTestIndustry(e.target.value)}
                  placeholder="Industry"
                  className="px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  value={testCity}
                  onChange={(e) => setTestCity(e.target.value)}
                  placeholder="City"
                  className="px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                onClick={handleTest}
                disabled={testing || !testCompany.trim()}
                className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                <Play size={16} />
                {testing ? 'Running…' : 'Generate sample outreach'}
              </button>

              {testResult && (
                <div className="mt-4 bg-subtle rounded-xl p-4 overflow-x-auto">
                  {testResult.subject && (
                    <p className="text-xs text-faint mb-2">
                      <span className="text-muted">Subject:</span> {testResult.subject}
                    </p>
                  )}
                  <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">
                    {testResult.body}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
