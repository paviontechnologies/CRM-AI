'use client';
import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, Building2, MapPin, Users, Tag } from 'lucide-react';
import api from '@/lib/api';

interface GenerateLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsGenerated: () => void;
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

export function GenerateLeadsModal({ isOpen, onClose, onLeadsGenerated }: GenerateLeadsModalProps) {
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [count, setCount] = useState(10);
  const [employeeSize, setEmployeeSize] = useState('');
  const [keywords, setKeywords] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; duplicatesSkipped: number; leads: any[] } | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!industry || !city) { setError('Please select industry and city'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/leads/generate', {
        industry, city, country, count,
        employeeSize: employeeSize || undefined,
        keywords: keywords || undefined,
      });
      setResult(res.data);
      onLeadsGenerated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate leads');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null); setError(''); setLoading(false);
    setIndustry(''); setCity(''); setKeywords(''); setEmployeeSize('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">AI Lead Generator</h2>
                <p className="text-blue-100 text-xs">Generate targeted leads for your niche using AI</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {result ? (
            /* Success State */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1">
                {result.created} Leads Generated!
              </h3>
              <p className="text-gray-500 text-sm mb-1">
                {result.duplicatesSkipped > 0 && `${result.duplicatesSkipped} duplicates skipped.`}
              </p>
              <p className="text-gray-400 text-xs mb-6">
                All new leads have been added to your Lead Explorer.
              </p>

              {/* Preview first 3 leads */}
              <div className="space-y-2 text-left mb-6">
                {result.leads.slice(0, 3).map((lead: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {lead.companyName?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{lead.companyName}</div>
                      <div className="text-xs text-gray-400 truncate">{lead.contactName} · {lead.email}</div>
                    </div>
                  </div>
                ))}
                {result.leads.length > 3 && (
                  <p className="text-center text-xs text-gray-400">+{result.leads.length - 3} more leads added</p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={handleClose}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                  Close
                </button>
                <button onClick={() => setResult(null)}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Generate More
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <div className="space-y-4">
              {/* Industry */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 text-blue-600" /> Industry / Niche *
                </label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {/* City + Country */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" /> City *
                  </label>
                  <select value={city} onChange={e => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Select city...</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {city === 'Other' && (
                    <input placeholder="Enter city name" className="w-full mt-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={e => setCity(e.target.value)} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                  <input value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Count + Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-4 h-4 text-blue-600" /> Number of Leads
                  </label>
                  <select value={count} onChange={e => setCount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} leads</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Company Size</label>
                  <select value={employeeSize} onChange={e => setEmployeeSize(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Any size</option>
                    {EMPLOYEE_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Keywords / Focus <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)}
                  placeholder="e.g. no CRM, manual processes, growing startup..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button onClick={handleClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleGenerate} disabled={loading || !industry || !city}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate {count} Leads</>
                  )}
                </button>
              </div>

              {loading && (
                <div className="text-center">
                  <p className="text-xs text-gray-400 animate-pulse">
                    AI is finding {industry} companies in {city}...
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
