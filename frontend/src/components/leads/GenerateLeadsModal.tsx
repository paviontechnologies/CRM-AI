'use client';
import { useState } from 'react';
import {
  X, Sparkles, Loader2, CheckCircle2, Building2, MapPin, Users, Tag,
  AlertTriangle, ArrowLeft, Check,
} from 'lucide-react';
import api from '@/lib/api';

interface GenerateLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsGenerated: () => void;
}

interface Suggestion {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  city?: string;
  country?: string;
  employeeSize?: string;
  source?: string;
  notes?: string;
}

const INDUSTRIES = [
  'Healthcare', 'Clinic / Hospital', 'Restaurant / F&B',
  'Education / Coaching', 'Logistics / Transport', 'Technology / SaaS',
  'Real Estate', 'Retail / E-Commerce', 'Manufacturing',
  'Finance / Accounting', 'Construction', 'Pharma',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur',
  'Nagpur', 'Indore', 'Bhopal', 'Patna', 'Chandigarh', 'Noida',
];

const EMPLOYEE_SIZES = ['1-10', '10-50', '50-200', '200-500', '500+'];

type Stage = 'form' | 'review' | 'saved';

export function GenerateLeadsModal({ isOpen, onClose, onLeadsGenerated }: GenerateLeadsModalProps) {
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [count, setCount] = useState(10);
  const [employeeSize, setEmployeeSize] = useState('');
  const [keywords, setKeywords] = useState('');

  const [stage, setStage] = useState<Stage>('form');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<{ created: number; duplicates: number } | null>(null);

  const handleGenerate = async () => {
    if (!industry || !city) { setError('Please select industry and city'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/leads/generate', {
        industry, city, country, count,
        employeeSize: employeeSize || undefined,
        keywords: keywords || undefined,
      });
      const list: Suggestion[] = res.data.suggestions || [];
      setSuggestions(list);
      // Nothing is pre-selected: the point of this step is a deliberate choice.
      setSelected(new Set());
      setStage('review');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === suggestions.length ? new Set() : new Set(suggestions.map((_, i) => i))
    );
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true); setError('');
    try {
      const picked = suggestions.filter((_, i) => selected.has(i));
      const res = await api.post('/leads/suggestions/approve', { leads: picked });
      setSaved({ created: res.data.created, duplicates: res.data.duplicates });
      setStage('saved');
      onLeadsGenerated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save leads');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStage('form'); setError(''); setLoading(false); setSaving(false);
    setSuggestions([]); setSelected(new Set()); setSaved(null);
  };

  const handleClose = () => {
    reset();
    setIndustry(''); setCity(''); setKeywords(''); setEmployeeSize('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-accent px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-onaccent" />
              </div>
              <div>
                <h2 className="text-onaccent font-semibold text-lg">AI Lead Suggestions</h2>
                <p className="text-brand-100 text-xs">
                  {stage === 'review'
                    ? 'Review and pick the ones worth keeping'
                    : 'AI-drafted prospect ideas for your niche'}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-onaccent/70 hover:text-onaccent transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {stage === 'saved' && saved ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-ink mb-1">
                {saved.created} {saved.created === 1 ? 'Lead' : 'Leads'} Saved
              </h3>
              {saved.duplicates > 0 && (
                <p className="text-muted text-sm mb-1">{saved.duplicates} duplicates skipped.</p>
              )}
              <p className="text-faint text-xs mb-6">
                They're in your Lead Explorer — verify the contact details before reaching out.
              </p>
              <div className="flex gap-3">
                <button onClick={handleClose}
                  className="flex-1 py-2.5 bg-subtle text-ink rounded-xl text-sm font-semibold hover:bg-line transition-colors">
                  Close
                </button>
                <button onClick={reset}
                  className="flex-1 py-2.5 bg-brand-600 text-onaccent rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
                  Generate More
                </button>
              </div>
            </div>
          ) : stage === 'review' ? (
            <div className="space-y-4">
              {/* The honesty notice — these are guesses, not sourced records. */}
              <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>These are AI-generated suggestions, not verified companies.</strong>{' '}
                  Names, emails and phone numbers are plausible guesses and may not correspond to
                  real businesses. Verify every contact before you use it.
                </p>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-center text-sm text-muted py-6">
                  No suggestions came back. Try a different industry or city.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">
                      {selected.size} of {suggestions.length} selected
                    </p>
                    <button onClick={toggleAll}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      {selected.size === suggestions.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {suggestions.map((s, i) => {
                      const isOn = selected.has(i);
                      return (
                        <button key={i} onClick={() => toggle(i)}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                            isOn
                              ? 'bg-brand-50 border-brand-300'
                              : 'bg-surface border-line hover:border-line'
                          }`}>
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                            isOn ? 'bg-brand-600 border-brand-600' : 'bg-surface border-line'
                          }`}>
                            {isOn && <Check className="w-3.5 h-3.5 text-onaccent" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink text-sm truncate">
                              {s.companyName}
                            </span>
                            <span className="block text-xs text-muted truncate">
                              {[s.contactName, s.email].filter(Boolean).join(' · ') || 'No contact details'}
                            </span>
                            {s.notes && (
                              <span className="block text-xs text-faint mt-0.5 line-clamp-2">{s.notes}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="pt-1 flex gap-3">
                <button onClick={() => { setStage('form'); setError(''); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-subtle text-ink rounded-xl text-sm font-semibold hover:bg-line transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleSave} disabled={saving || selected.size === 0}
                  className="flex-1 py-3 bg-accent text-onaccent rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <>Save {selected.size > 0 ? selected.size : ''} to Leads</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
                  <Building2 className="w-4 h-4 text-brand-600" /> Industry / Niche *
                </label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-surface">
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
                    <MapPin className="w-4 h-4 text-brand-600" /> City *
                  </label>
                  <select value={city} onChange={e => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-surface">
                    <option value="">Select city...</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {city === 'Other' && (
                    <input placeholder="Enter city name" className="w-full mt-2 px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      onChange={e => setCity(e.target.value)} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Country</label>
                  <input value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
                    <Users className="w-4 h-4 text-brand-600" /> Number of Suggestions
                  </label>
                  <select value={count} onChange={e => setCount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-surface">
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} suggestions</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Company Size</label>
                  <select value={employeeSize} onChange={e => setEmployeeSize(e.target.value)}
                    className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-surface">
                    <option value="">Any size</option>
                    {EMPLOYEE_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
                  <Tag className="w-4 h-4 text-brand-600" /> Keywords / Focus <span className="font-normal text-faint">(optional)</span>
                </label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)}
                  placeholder="e.g. no CRM, manual processes, growing startup..."
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button onClick={handleClose}
                  className="flex-1 py-3 bg-subtle text-ink rounded-xl text-sm font-semibold hover:bg-line transition-colors">
                  Cancel
                </button>
                <button onClick={handleGenerate} disabled={loading || !industry || !city}
                  className="flex-1 py-3 bg-accent text-onaccent rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Suggest {count} Leads</>
                  )}
                </button>
              </div>

              {loading && (
                <div className="text-center">
                  <p className="text-xs text-faint animate-pulse">
                    AI is drafting {industry} prospects in {city}...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
