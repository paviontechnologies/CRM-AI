'use client';
import { useState } from 'react';
import { X, Copy, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import api from '@/lib/api';

const TEMPLATES = [
  {
    id: 'hospital-hms',
    icon: '🏥',
    name: 'Hospital HMS',
    description: 'Outreach for hospitals adopting a Hospital Management System. Targets CMOs and IT heads.',
    industry: 'Healthcare',
    subtype: 'HMS Software',
    channel: 'email' as const,
    badge: 'Healthcare',
    badgeColor: 'bg-red-100 text-red-700',
  },
  {
    id: 'clinic-crm',
    icon: '💊',
    name: 'Clinic CRM',
    description: 'Cold outreach for small clinics looking to digitize patient management and appointment booking.',
    industry: 'Healthcare',
    subtype: 'Clinic CRM',
    channel: 'email' as const,
    badge: 'Healthcare',
    badgeColor: 'bg-red-100 text-red-700',
  },
  {
    id: 'restaurant-ordering',
    icon: '🍽️',
    name: 'Restaurant Ordering',
    description: 'Pitching online ordering and table management software to restaurant owners and chains.',
    industry: 'Restaurant',
    subtype: 'Restaurant Software',
    channel: 'email' as const,
    badge: 'F&B',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'school-erp',
    icon: '🎓',
    name: 'School ERP',
    description: 'Outreach to school principals and education directors about student management ERP solutions.',
    industry: 'Education',
    subtype: 'School ERP',
    channel: 'email' as const,
    badge: 'Education',
    badgeColor: 'bg-brand-100 text-brand-700',
  },
  {
    id: 'warehouse-wms',
    icon: '📦',
    name: 'Warehouse WMS',
    description: 'Target warehouse managers at logistics companies about WMS implementation and ROI.',
    industry: 'Logistics',
    subtype: 'WMS Software',
    channel: 'email' as const,
    badge: 'Logistics',
    badgeColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    id: 'erp-buyers',
    icon: '⚙️',
    name: 'ERP Buyers',
    description: 'C-level outreach for manufacturing companies evaluating ERP solutions for operations.',
    industry: 'Manufacturing',
    subtype: 'ERP System',
    channel: 'email' as const,
    badge: 'Manufacturing',
    badgeColor: 'bg-subtle text-ink',
  },
  {
    id: 'fintech-saas',
    icon: '💳',
    name: 'Fintech SaaS',
    description: 'Outreach to CFOs and finance heads at SMBs about accounting and fintech automation tools.',
    industry: 'Finance',
    subtype: 'Fintech',
    channel: 'email' as const,
    badge: 'Finance',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: 'retail-pos',
    icon: '🛒',
    name: 'Retail POS',
    description: 'Pitch POS and inventory management solutions to retail store owners and chains.',
    industry: 'Retail',
    subtype: 'POS System',
    channel: 'email' as const,
    badge: 'Retail',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'real-estate-crm',
    icon: '🏢',
    name: 'Real Estate CRM',
    description: 'Outreach to real estate brokers and developers about CRM and lead management platforms.',
    industry: 'Real Estate',
    subtype: 'Real Estate CRM',
    channel: 'email' as const,
    badge: 'Real Estate',
    badgeColor: 'bg-brand-100 text-brand-700',
  },
];

interface GenerateModalProps {
  template: typeof TEMPLATES[0];
  onClose: () => void;
}

function GenerateModal({ template, onClose }: GenerateModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    try {
      // Preview endpoint drafts the copy without saving a throwaway lead.
      const res = await api.post('/leads/outreach/preview', {
        companyName: companyName || 'Demo Company',
        contactName: contactName || undefined,
        city: city || undefined,
        industry: template.industry,
        channel: template.channel,
        templateType: template.subtype,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate outreach');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = result?.message || result?.email || result?.body || result?.content || JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h3 className="font-semibold text-ink">{template.name}</h3>
              <p className="text-xs text-muted">Email Outreach</p>
            </div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Company Name *</label>
                <input
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={`e.g. ${template.industry} Corp`}
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Contact Name</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Dr. Sharma"
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Channel</label>
                <div className="px-4 py-2.5 border rounded-xl text-sm font-medium bg-brand-50 border-brand-200 text-brand-700">
                  ✉️ Email
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-onaccent rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Outreach
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Generated Message</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-line text-ink rounded-lg text-xs font-medium transition-colors"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {result.subject && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-1">SUBJECT</p>
                  <p className="text-sm font-medium text-ink bg-subtle px-3 py-2 rounded-lg border border-line">
                    {result.subject}
                  </p>
                </div>
              )}
              <div className="bg-subtle border border-line rounded-xl p-4 text-sm text-ink whitespace-pre-wrap leading-relaxed">
                {result.message || result.email || result.body || result.content || JSON.stringify(result, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AITemplatesPage() {
  const [selected, setSelected] = useState<typeof TEMPLATES[0] | null>(null);

  return (
    <div className="space-y-5">
      {selected && <GenerateModal template={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">AI Templates</h1>
          <p className="text-muted text-sm mt-1">Industry-specific AI outreach templates for faster lead conversion</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-semibold text-brand-700">{TEMPLATES.length}</div>
          <div className="text-xs text-brand-600 mt-1 font-medium">Total Templates</div>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-semibold text-brand-700">{new Set(TEMPLATES.map((t) => t.industry)).size}</div>
          <div className="text-xs text-brand-600 mt-1 font-medium">Industries Covered</div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="bg-surface rounded-2xl border border-line shadow-sm hover:shadow-md hover:border-brand-200 transition-all group"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl">{template.icon}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${template.badgeColor}`}>
                    {template.badge}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    template.channel === 'email'
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {template.channel === 'email' ? '✉️' : '💬'}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-ink mb-2 group-hover:text-brand-600 transition-colors">
                {template.name}
              </h3>
              <p className="text-sm text-muted leading-relaxed mb-4">{template.description}</p>
              <button
                onClick={() => setSelected(template)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-onaccent rounded-xl text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Outreach
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
