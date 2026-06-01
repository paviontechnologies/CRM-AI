'use client';
import { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Mail,
  MessageSquare,
  Trash2,
  Eye,
  Users,
  Send,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api from '@/lib/api';

interface CampaignStep {
  id?: string;
  type: 'email' | 'whatsapp' | 'linkedin';
  dayOffset: number;
  subject?: string;
  content: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  targetIndustry?: string;
  targetCity?: string;
  enrolledCount?: number;
  sentCount?: number;
  replyCount?: number;
  steps?: CampaignStep[];
  createdAt?: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

const STEP_TYPES = ['email', 'whatsapp', 'linkedin'] as const;

function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [targetCity, setTargetCity] = useState('');
  const [steps, setSteps] = useState<CampaignStep[]>([
    { type: 'email', dayOffset: 1, subject: '', content: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStep = () => {
    setSteps([...steps, { type: 'email', dayOffset: steps.length + 1, subject: '', content: '' }]);
  };

  const removeStep = (i: number) => {
    setSteps(steps.filter((_, idx) => idx !== i));
  };

  const updateStep = (i: number, key: keyof CampaignStep, value: any) => {
    setSteps(steps.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/campaigns', { name, description, targetIndustry, targetCity, steps });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900 text-lg">Create Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Campaign Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hospital CRM Outreach Q2"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this campaign about?"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Industry</label>
                <input
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value)}
                  placeholder="e.g. Healthcare"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target City</label>
                <input
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                  placeholder="e.g. Delhi"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Sequence Steps</label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Step
                </button>
              </div>

              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(i, 'type', e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Day</span>
                        <input
                          type="number"
                          min={1}
                          value={step.dayOffset}
                          onChange={(e) => updateStep(i, 'dayOffset', parseInt(e.target.value) || 1)}
                          className="w-14 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        className="ml-auto text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {step.type === 'email' && (
                      <input
                        value={step.subject || ''}
                        onChange={(e) => updateStep(i, 'subject', e.target.value)}
                        placeholder="Email subject line..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                    <textarea
                      value={step.content}
                      onChange={(e) => updateStep(i, 'content', e.target.value)}
                      rows={3}
                      placeholder={`${step.type === 'email' ? 'Email body' : 'Message'}... Use {{firstName}}, {{companyName}} for personalization`}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  onDelete,
  onRefresh,
}: {
  campaign: Campaign;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const loadDetail = async () => {
    if (expanded) { setExpanded(false); return; }
    setLoadingDetail(true);
    try {
      const res = await api.get(`/campaigns/${campaign.id}`);
      setDetail(res.data);
      setExpanded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete campaign "${campaign.name}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/campaigns/${campaign.id}`);
      onDelete(campaign.id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const replyRate = campaign.sentCount && campaign.sentCount > 0
    ? Math.round(((campaign.replyCount || 0) / campaign.sentCount) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-bold text-gray-900 truncate">{campaign.name}</h3>
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{campaign.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {campaign.targetIndustry && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  {campaign.targetIndustry}
                </span>
              )}
              {campaign.targetCity && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                  {campaign.targetCity}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={loadDetail}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-medium transition-colors"
            >
              {loadingDetail ? (
                <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              {expanded ? 'Hide' : 'View'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
          <div className="text-center">
            <div className="text-lg font-black text-gray-900">{campaign.enrolledCount || 0}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
              <Users className="w-3 h-3" /> Enrolled
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-gray-900">{campaign.sentCount || 0}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
              <Send className="w-3 h-3" /> Sent
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-gray-900">{replyRate}%</div>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
              <BarChart3 className="w-3 h-3" /> Reply Rate
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Steps */}
      {expanded && detail && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Sequence Steps</h4>
          {(!detail.steps || detail.steps.length === 0) && (
            <p className="text-gray-400 text-sm">No steps configured</p>
          )}
          <div className="space-y-2">
            {detail.steps?.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${step.type === 'email' ? 'bg-blue-100 text-blue-600' : step.type === 'whatsapp' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {step.type === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 capitalize">{step.type}</span>
                    <span className="text-xs text-gray-400">· Day {step.dayOffset}</span>
                  </div>
                  {step.subject && (
                    <p className="text-xs text-gray-600 font-medium mt-0.5">{step.subject}</p>
                  )}
                  {step.content && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{step.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campaigns');
      setCampaigns(Array.isArray(res.data) ? res.data : res.data.campaigns || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-5">
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchCampaigns}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">Build and manage your AI-powered outreach sequences</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: campaigns.length, color: 'text-gray-900' },
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, color: 'text-green-600' },
          { label: 'Draft', value: campaigns.filter(c => c.status === 'draft').length, color: 'text-gray-500' },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, color: 'text-blue-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.label} Campaigns</div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && campaigns.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">No campaigns yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Create your first outreach campaign to start engaging leads</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Create First Campaign
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={handleDelete}
              onRefresh={fetchCampaigns}
            />
          ))}
        </div>
      )}
    </div>
  );
}
