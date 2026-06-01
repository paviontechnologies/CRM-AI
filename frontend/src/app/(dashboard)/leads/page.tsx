'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  RefreshCw,
  Zap,
  Mail,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  CheckCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { ImportLeadModal } from '@/components/leads/ImportLeadModal';
import { GenerateLeadsModal } from '@/components/leads/GenerateLeadsModal';

interface Lead {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  city?: string;
  status: string;
  intentScore?: number;
  source?: string;
  createdAt?: string;
}

const STATUS_OPTIONS = ['ALL', 'NEW', 'QUALIFIED', 'CONTACTED', 'REPLIED', 'MEETING_BOOKED', 'CLOSED_WON', 'CLOSED_LOST'];
const INDUSTRY_OPTIONS = ['ALL', 'Healthcare', 'Restaurant', 'Tech SaaS', 'Logistics', 'Education', 'Manufacturing', 'Finance', 'Retail'];

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg font-medium">Unscored</span>;
  if (score >= 80) return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg font-bold">{score} 🔥</span>;
  if (score >= 50) return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-lg font-bold">{score}</span>;
  return <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-bold">{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-700',
    QUALIFIED: 'bg-indigo-100 text-indigo-700',
    CONTACTED: 'bg-yellow-100 text-yellow-700',
    REPLIED: 'bg-orange-100 text-orange-700',
    MEETING_BOOKED: 'bg-purple-100 text-purple-700',
    PROPOSAL_SENT: 'bg-cyan-100 text-cyan-700',
    CLOSED_WON: 'bg-green-100 text-green-700',
    CLOSED_LOST: 'bg-red-100 text-red-600',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-1 text-xs rounded-lg font-medium ${cls}`}>{status.replace('_', ' ')}</span>;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-100 rounded w-24" />
        </td>
      ))}
    </tr>
  );
}

interface OutreachModalProps {
  lead: Lead | null;
  onClose: () => void;
}

function OutreachModal({ lead, onClose }: OutreachModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');

  useEffect(() => {
    if (!lead) return;
    setLoading(true);
    setResult(null);
    setError('');
    api
      .post(`/leads/${lead.id}/outreach`, { channel })
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to generate outreach'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, channel]);

  const handleCopy = () => {
    const text = result?.message || result?.email || result?.body || JSON.stringify(result);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-900">AI Outreach Generator</h3>
            <p className="text-sm text-gray-500">{lead.companyName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setChannel('email')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${channel === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Email
          </button>
          <button
            onClick={() => setChannel('whatsapp')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${channel === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            WhatsApp
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-500 text-sm">Generating personalized message...</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}
          {result && !loading && (
            <div className="space-y-4">
              {result.subject && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Subject</p>
                  <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{result.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Message</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-200">
                  {result.message || result.email || result.body || result.content || JSON.stringify(result, null, 2)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex gap-3">
          <button
            onClick={handleCopy}
            disabled={!result || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Message'}
          </button>
          <button
            onClick={() => { setResult(null); setLoading(true); api.post(`/leads/${lead.id}/outreach`, { channel }).then(r => setResult(r.data)).catch(e => setError(e.response?.data?.error || 'Failed')).finally(() => setLoading(false)); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isGenerateOpen, setGenerateOpen] = useState(false);
  const [outreachLead, setOutreachLead] = useState<Lead | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [industryFilter, setIndustryFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (industryFilter !== 'ALL') params.industry = industryFilter;
      const res = await api.get('/leads', { params });
      // Support both array response and paginated { leads, total }
      if (Array.isArray(res.data)) {
        setLeads(res.data);
        setTotal(res.data.length);
      } else {
        setLeads(res.data.leads || res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, industryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLeads(), 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const handleScore = async (lead: Lead) => {
    setScoringId(lead.id);
    try {
      const res = await api.post(`/leads/${lead.id}/score`);
      const newScore = res.data?.intentScore ?? res.data?.analysis?.intentScore ?? res.data?.score;
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, intentScore: newScore } : l)));
    } catch (err: any) {
      console.error('Score failed:', err);
    } finally {
      setScoringId(null);
    }
  };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    try {
      await api.patch(`/leads/${lead.id}/status`, { status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l)));
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const headers = ['Company', 'Contact', 'Email', 'Industry', 'City', 'Score', 'Status'];
    const rows = leads.map((l) => [
      l.companyName,
      l.contactName || '',
      l.email || '',
      l.industry || '',
      l.city || '',
      l.intentScore || '',
      l.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <ImportLeadModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onLeadAdded={fetchLeads} />
      <GenerateLeadsModal isOpen={isGenerateOpen} onClose={() => setGenerateOpen(false)} onLeadsGenerated={fetchLeads} />
      <OutreachModal lead={outreachLead} onClose={() => setOutreachLead(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Lead Explorer</h1>
          <p className="text-gray-500 text-sm mt-1">Manage, score and engage your B2B leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
          <button
            onClick={() => setGenerateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-sm font-bold transition-opacity shadow-lg shadow-blue-200"
          >
            <Zap className="w-4 h-4" />
            AI Generate Leads
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search company, email, contact..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}>
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <select
          value={industryFilter}
          onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          {INDUSTRY_OPTIONS.map((i) => (
            <option key={i} value={i}>{i === 'ALL' ? 'All Industries' : i}</option>
          ))}
        </select>

        <button
          onClick={fetchLeads}
          className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        <span className="text-sm text-gray-400 ml-auto">{total} lead{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}

              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No leads found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your filters or add a new lead</p>
                      <button
                        onClick={() => setModalOpen(true)}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Add First Lead
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {lead.companyName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{lead.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm text-gray-700">{lead.contactName || '-'}</div>
                    {lead.email && (
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{lead.industry || '-'}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{lead.city || '-'}</td>
                  <td className="px-4 py-3.5">
                    <ScoreBadge score={lead.intentScore} />
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead, e.target.value)}
                      className="text-xs border-0 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {STATUS_OPTIONS.filter(s => s !== 'ALL').map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleScore(lead)}
                        disabled={scoringId === lead.id}
                        title="AI Score"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {scoringId === lead.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Score
                      </button>
                      <button
                        onClick={() => setOutreachLead(lead)}
                        title="Generate Outreach"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        Outreach
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
