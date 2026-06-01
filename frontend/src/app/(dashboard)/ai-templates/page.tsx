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
    channel: 'whatsapp' as const,
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
    channel: 'whatsapp' as const,
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
    badgeColor: 'bg-blue-100 text-blue-700',
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
    badgeColor: 'bg-gray-100 text-gray-700',
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
    channel: 'whatsapp' as const,
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
    channel: 'whatsapp' as const,
    badge: 'Real Estate',
    badgeColor: 'bg-indigo-100 text-indigo-700',
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
      // Create a temp lead and generate outreach
      const leadRes = await api.post('/leads', {
        companyName: companyName || 'Demo Company',
        contactName: contactName || undefined,
        city: city || undefined,
        industry: template.industry,
        source: 'manual',
      });
      const leadId = leadRes.data?.id || leadRes.data?.lead?.id;
      if (!leadId) throw new Error('Failed to create lead');
      const outreachRes = await api.post(`/leads/${leadId}/outreach`, {
        channel: template.channel,
        subtype: template.subtype,
      });
      setResult(outreachRes.data);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h3 className="font-bold text-gray-900">{template.name}</h3>
              <p className="text-xs text-gray-500">{template.channel === 'email' ? 'Email Outreach' : 'WhatsApp Message'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name *</label>
                <input
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={`e.g. ${template.industry} Corp`}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Name</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Dr. Sharma"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Channel</label>
                <div className={`px-4 py-2.5 border rounded-xl text-sm font-medium ${template.channel === 'email' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                  {template.channel === 'email' ? '✉️ Email' : '💬 WhatsApp'}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
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
                <p className="text-sm font-semibold text-gray-700">Generated Message</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {result.subject && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">SUBJECT</p>
                  <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    {result.subject}
                  </p>
                </div>
              )}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
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
  const [filterChannel, setFilterChannel] = useState<'all' | 'email' | 'whatsapp'>('all');

  const filtered = TEMPLATES.filter(
    (t) => filterChannel === 'all' || t.channel === filterChannel
  );

  return (
    <div className="space-y-5">
      {selected && <GenerateModal template={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">AI Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Industry-specific AI outreach templates for faster lead conversion</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'email', 'whatsapp'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterChannel(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                filterChannel === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'email' ? '✉️ Email' : '💬 WhatsApp'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-blue-700">{TEMPLATES.length}</div>
          <div className="text-xs text-blue-600 mt-1 font-medium">Total Templates</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-indigo-700">{TEMPLATES.filter(t => t.channel === 'email').length}</div>
          <div className="text-xs text-indigo-600 mt-1 font-medium">Email Templates</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-green-700">{TEMPLATES.filter(t => t.channel === 'whatsapp').length}</div>
          <div className="text-xs text-green-600 mt-1 font-medium">WhatsApp Templates</div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {template.channel === 'email' ? '✉️' : '💬'}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{template.description}</p>
              <button
                onClick={() => setSelected(template)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
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
