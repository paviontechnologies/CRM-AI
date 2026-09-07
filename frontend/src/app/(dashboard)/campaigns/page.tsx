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
  Play,
  Pause,
} from 'lucide-react';
import api from '@/lib/api';

interface CampaignStep {
  id?: string;
  type: 'email' | 'linkedin';
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
    draft: 'bg-subtle text-muted',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-brand-100 text-brand-700',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${map[status] || 'bg-subtle text-muted'}`}>
      {status}
    </span>
  );
}

const STEP_TYPES = ['email', 'linkedin'] as const;

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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-ink text-lg">Create Campaign</h3>
          <button onClick={onClose} className="text-faint hover:text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-ink mb-1.5">Campaign Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hospital CRM Outreach Q2"
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-ink mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this campaign about?"
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Target Industry</label>
                <input
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value)}
                  placeholder="e.g. Healthcare"
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Target City</label>
                <input
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                  placeholder="e.g. Delhi"
                  className="w-full px-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-ink">Sequence Steps</label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Step
                </button>
              </div>

              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="border border-line rounded-xl p-4 space-y-3 bg-subtle/50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-brand-600 text-onaccent rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {i + 1}
                      </span>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(i, 'type', e.target.value)}
                        className="text-sm border border-line rounded-lg px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted">Day</span>
                        <input
                          type="number"
                          min={1}
                          value={step.dayOffset}
                          onChange={(e) => updateStep(i, 'dayOffset', parseInt(e.target.value) || 1)}
                          className="w-14 text-sm border border-line rounded-lg px-2 py-1.5 text-center bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                        className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    )}
                    <textarea
                      value={step.content}
                      onChange={(e) => updateStep(i, 'content', e.target.value)}
                      rows={3}
                      placeholder={`${step.type === 'email' ? 'Email body' : 'Message'}... Use {{firstName}}, {{companyName}} for personalization`}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
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
              className="px-4 py-2.5 bg-subtle hover:bg-line text-ink rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-onaccent rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
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
  const [statusLoading, setStatusLoading] = useState(false);

  // Only 'active' campaigns are picked up by the backend scheduler.
  const handleToggleStatus = async () => {
    const next = campaign.status === 'active' ? 'paused' : 'active';
    setStatusLoading(true);
    try {
      await api.patch(`/campaigns/${campaign.id}/status`, { status: next });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not change the campaign status');
    } finally {
      setStatusLoading(false);
    }
  };

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
    <div className="bg-surface rounded-2xl border border-line shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-ink truncate">{campaign.name}</h3>
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.description && (
              <p className="text-sm text-muted mb-3 line-clamp-2">{campaign.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-muted">
              {campaign.targetIndustry && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full"></span>
                  {campaign.targetIndustry}
                </span>
              )}
              {campaign.targetCity && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full"></span>
                  {campaign.targetCity}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              title={
                campaign.status === 'active'
                  ? 'Pause — stops the scheduler from sending further steps'
                  : 'Activate — the scheduler starts sending enrolled leads'
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 ${
                campaign.status === 'active'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                  : 'bg-green-50 hover:bg-green-100 text-green-700'
              }`}
            >
              {statusLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : campaign.status === 'active' ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {campaign.status === 'active' ? 'Pause' : 'Activate'}
            </button>
            <button
              onClick={loadDetail}
              className="flex items-center gap-1.5 px-3 py-2 bg-subtle hover:bg-subtle text-muted rounded-xl text-xs font-medium transition-colors"
            >
              {loadingDetail ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
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
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
          <div className="text-center">
            <div className="text-lg font-semibold text-ink">{campaign.enrolledCount || 0}</div>
            <div className="text-xs text-faint flex items-center justify-center gap-1 mt-0.5">
              <Users className="w-3 h-3" /> Enrolled
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-ink">{campaign.sentCount || 0}</div>
            <div className="text-xs text-faint flex items-center justify-center gap-1 mt-0.5">
              <Send className="w-3 h-3" /> Sent
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-ink">{replyRate}%</div>
            <div className="text-xs text-faint flex items-center justify-center gap-1 mt-0.5">
              <BarChart3 className="w-3 h-3" /> Reply Rate
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Steps */}
      {expanded && detail && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-4">
          <h4 className="text-sm font-semibold text-ink mb-3">Sequence Steps</h4>
          {(!detail.steps || detail.steps.length === 0) && (
            <p className="text-faint text-sm">No steps configured</p>
          )}
          <div className="space-y-2">
            {detail.steps?.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-subtle rounded-xl">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand-100 text-brand-600">
                  {step.type === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink capitalize">{step.type}</span>
                    <span className="text-xs text-faint">· Day {step.dayOffset}</span>
                  </div>
                  {step.subject && (
                    <p className="text-xs text-muted font-medium mt-0.5">{step.subject}</p>
                  )}
                  {step.content && (
                    <p className="text-xs text-faint mt-0.5 line-clamp-2">{step.content}</p>
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
          <h1 className="text-2xl font-semibold text-ink">Campaigns</h1>
          <p className="text-muted text-sm mt-1">Build and manage your AI-powered outreach sequences</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-onaccent rounded-xl text-sm font-semibold transition-colors shadow-sm"
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
          { label: 'Total', value: campaigns.length, color: 'text-ink' },
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, color: 'text-green-600' },
          { label: 'Draft', value: campaigns.filter(c => c.status === 'draft').length, color: 'text-muted' },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, color: 'text-brand-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface rounded-2xl p-4 border border-line shadow-sm text-center">
            <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-faint mt-1">{stat.label} Campaigns</div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && campaigns.length === 0 && (
        <div className="text-center py-20 bg-surface rounded-2xl border border-line">
          <div className="w-16 h-16 bg-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-faint" />
          </div>
          <p className="text-ink font-semibold text-lg">No campaigns yet</p>
          <p className="text-faint text-sm mt-1 mb-6">Create your first outreach campaign to start engaging leads</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-onaccent rounded-xl text-sm font-semibold transition-colors"
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
