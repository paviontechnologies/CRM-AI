'use client';
import { useState, useEffect } from 'react';
import { Plus, X, MoveRight, GitBranch } from 'lucide-react';
import api from '@/lib/api';

const STAGES = [
  { key: 'NEW', label: 'New', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'bg-indigo-500', light: 'bg-indigo-50 border-indigo-200' },
  { key: 'CONTACTED', label: 'Contacted', color: 'bg-yellow-500', light: 'bg-yellow-50 border-yellow-200' },
  { key: 'REPLIED', label: 'Replied', color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200' },
  { key: 'MEETING_BOOKED', label: 'Meeting', color: 'bg-purple-500', light: 'bg-purple-50 border-purple-200' },
  { key: 'PROPOSAL_SENT', label: 'Proposal', color: 'bg-cyan-500', light: 'bg-cyan-50 border-cyan-200' },
  { key: 'CLOSED_WON', label: 'Won', color: 'bg-green-500', light: 'bg-green-50 border-green-200' },
  { key: 'CLOSED_LOST', label: 'Lost', color: 'bg-red-500', light: 'bg-red-50 border-red-200' },
];

interface LeadCard {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  industry?: string;
  intentScore?: number;
  stage?: string;
  status?: string;
  expectedRevenue?: number;
  assignedTo?: string;
}

interface Pipeline {
  id: string;
  name: string;
}

function ScoreChip({ score }: { score?: number }) {
  if (!score) return null;
  const cls = score >= 80 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600';
  return <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${cls}`}>{score}</span>;
}

function MoveModal({
  lead,
  onClose,
  onMoved,
  pipelineId,
}: {
  lead: LeadCard;
  onClose: () => void;
  onMoved: () => void;
  pipelineId: string;
}) {
  const [toStage, setToStage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMove = async () => {
    if (!toStage) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/pipeline/move', {
        leadId: lead.id,
        pipelineId,
        toStage,
      });
      onMoved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to move lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-900">Move Lead</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Moving</p>
            <p className="font-semibold text-gray-900">{lead.companyName}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Move to Stage</label>
            <select
              value={toStage}
              onChange={(e) => setToStage(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select stage...</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!toStage || loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MoveRight className="w-4 h-4" />
              )}
              Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPipeline, setCreatingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [movingLead, setMovingLead] = useState<LeadCard | null>(null);
  const [error, setError] = useState('');

  const fetchPipelines = async () => {
    try {
      const res = await api.get('/pipeline');
      const data = Array.isArray(res.data) ? res.data : res.data.pipelines || [];
      setPipelines(data);
      if (data.length > 0 && !activePipelineId) {
        setActivePipelineId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async (pipelineId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/pipeline/${pipelineId}/leads`);
      setLeads(Array.isArray(res.data) ? res.data : res.data.leads || []);
    } catch (err) {
      console.error(err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activePipelineId) fetchLeads(activePipelineId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePipelineId]);

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;
    try {
      const res = await api.post('/pipeline', { name: newPipelineName });
      const newPipeline = res.data.pipeline || res.data;
      setPipelines((prev) => [...prev, newPipeline]);
      setActivePipelineId(newPipeline.id);
      setCreatingPipeline(false);
      setNewPipelineName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create pipeline');
    }
  };

  const leadsInStage = (stage: string) =>
    leads.filter((l) => (l.stage || l.status) === stage);

  const totalRevenue = (stage: string) =>
    leadsInStage(stage).reduce((sum, l) => sum + (l.expectedRevenue || 0), 0);

  if (loading && activePipelineId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full">
      {movingLead && activePipelineId && (
        <MoveModal
          lead={movingLead}
          pipelineId={activePipelineId}
          onClose={() => setMovingLead(null)}
          onMoved={() => {
            if (activePipelineId) fetchLeads(activePipelineId);
            setMovingLead(null);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Pipeline</h1>
          <p className="text-gray-500 text-sm mt-1">Visual kanban view of your sales pipeline</p>
        </div>
        <button
          onClick={() => setCreatingPipeline(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          New Pipeline
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Create Pipeline Form */}
      {creatingPipeline && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <form onSubmit={handleCreatePipeline} className="flex items-center gap-3">
            <input
              autoFocus
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="Pipeline name (e.g. Q2 Healthcare)"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreatingPipeline(false)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Pipeline tabs */}
      {pipelines.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePipelineId(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activePipelineId === p.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* No pipeline */}
      {pipelines.length === 0 && !loading && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">No pipelines yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Create your first pipeline to start tracking deals</p>
          <button
            onClick={() => setCreatingPipeline(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Create Pipeline
          </button>
        </div>
      )}

      {/* Kanban Board */}
      {activePipelineId && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const stageLeads = leadsInStage(stage.key);
              const revenue = totalRevenue(stage.key);
              return (
                <div key={stage.key} className="w-64 flex-shrink-0">
                  {/* Column Header */}
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border mb-3 ${stage.light}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-sm font-semibold text-gray-800">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-600 bg-white px-1.5 py-0.5 rounded-lg">
                        {stageLeads.length}
                      </span>
                    </div>
                  </div>
                  {revenue > 0 && (
                    <div className="text-xs text-gray-400 px-1 mb-2">
                      ₹{revenue.toLocaleString('en-IN')} potential
                    </div>
                  )}

                  {/* Cards */}
                  <div className="space-y-2.5 min-h-[200px]">
                    {stageLeads.length === 0 && (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-400">No leads</p>
                      </div>
                    )}
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                            {lead.companyName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <ScoreChip score={lead.intentScore} />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{lead.companyName}</p>
                        {lead.contactName && (
                          <p className="text-xs text-gray-400 mt-0.5">{lead.contactName}</p>
                        )}
                        {lead.email && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{lead.email}</p>
                        )}
                        {lead.industry && (
                          <span className="inline-block mt-1.5 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {lead.industry}
                          </span>
                        )}
                        <button
                          onClick={() => setMovingLead(lead)}
                          className="mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-500 rounded-lg text-xs font-medium transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoveRight className="w-3 h-3" />
                          Move
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
