'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Plus, X, GitBranch, Trophy, Ban, IndianRupee, Building2, GripVertical } from 'lucide-react';
import api from '@/lib/api';

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  expectedCloseDate?: string | null;
  lead?: { id: string; companyName: string; contactName?: string | null } | null;
  assignedTo?: { user: { id: string; name?: string | null } } | null;
}

interface Stage {
  id: string;
  name: string;
  color?: string | null;
  orderIndex: number;
  totalValue: number;
  deals: Deal[];
}

interface Pipeline {
  id: string;
  name: string;
}

const formatMoney = (value: number, currency = 'INR') =>
  currency === 'INR'
    ? `₹${value.toLocaleString('en-IN')}`
    : `${currency} ${value.toLocaleString()}`;

function DealCard({ deal, dragging }: { deal: Deal; dragging?: boolean }) {
  return (
    <div
      className={`bg-white border rounded-xl p-3 shadow-sm transition-all ${
        dragging ? 'border-brand-400 shadow-lg rotate-2' : 'border-slate-200 hover:border-brand-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-tight">{deal.title}</p>
          {deal.lead && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              {deal.lead.companyName}
            </p>
          )}
          <p className="text-sm font-bold text-slate-800 mt-1.5">
            {formatMoney(deal.value, deal.currency)}
          </p>
          {deal.assignedTo?.user?.name && (
            <p className="text-xs text-slate-400 mt-1">{deal.assignedTo.user.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableDeal({ deal, onWin, onLose }: { deal: Deal; onWin: () => void; onLose: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });

  return (
    <div ref={setNodeRef} className={`group ${isDragging ? 'opacity-40' : ''}`}>
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <DealCard deal={deal} />
      </div>
      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onWin}
          className="flex-1 flex items-center justify-center gap-1 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
        >
          <Trophy className="w-3 h-3" /> Won
        </button>
        <button
          onClick={onLose}
          className="flex-1 flex items-center justify-center gap-1 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
        >
          <Ban className="w-3 h-3" /> Lost
        </button>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  onWin,
  onLose,
}: {
  stage: Stage;
  onWin: (deal: Deal) => void;
  onLose: (deal: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="w-72 flex-shrink-0 flex flex-col">
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-xl border mb-3"
        style={{
          backgroundColor: `${stage.color || '#6b7280'}12`,
          borderColor: `${stage.color || '#6b7280'}33`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color || '#6b7280' }}
          />
          <span className="text-sm font-semibold text-slate-800 truncate">{stage.name}</span>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded-lg flex-shrink-0">
          {stage.deals.length}
        </span>
      </div>

      {stage.totalValue > 0 && (
        <div className="text-xs text-slate-500 px-1 mb-2 font-medium">
          {formatMoney(stage.totalValue)} in play
        </div>
      )}

      <div
        ref={setNodeRef}
        className={`space-y-2.5 min-h-[200px] flex-1 rounded-xl transition-colors p-1 ${
          isOver ? 'bg-brand-50 ring-2 ring-brand-300 ring-inset' : ''
        }`}
      >
        {stage.deals.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Drop a deal here</p>
          </div>
        )}
        {stage.deals.map((deal) => (
          <DraggableDeal
            key={deal.id}
            deal={deal}
            onWin={() => onWin(deal)}
            onLose={() => onLose(deal)}
          />
        ))}
      </div>
    </div>
  );
}

function NewDealModal({
  stages,
  onClose,
  onCreated,
}: {
  stages: Stage[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stageId, setStageId] = useState(stages[0]?.id || '');
  const [leadId, setLeadId] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [leads, setLeads] = useState<{ id: string; companyName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/leads', { params: { limit: 200 } })
      .then((res) => setLeads(res.data.leads || []))
      .catch(() => setLeads([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/deals', {
        title: title.trim(),
        value: Number(value) || 0,
        stageId: stageId || undefined,
        leadId: leadId || undefined,
        // The API expects a full ISO datetime, not the date-only input value.
        expectedCloseDate: expectedCloseDate
          ? new Date(expectedCloseDate).toISOString()
          : undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-slate-900">New Deal</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deal title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Apollo Hospitals — HMS rollout"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Value (₹)</label>
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Close date</label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stage</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Link to lead <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">No lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.companyName}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPipeline, setCreatingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [error, setError] = useState('');

  // A small activation distance keeps the Won/Lost buttons clickable.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await api.get('/pipeline');
      const data: Pipeline[] = Array.isArray(res.data) ? res.data : [];
      setPipelines(data);
      setActivePipelineId((current) => current || data[0]?.id || null);
      if (data.length === 0) setLoading(false);
    } catch {
      setError('Could not load pipelines');
      setLoading(false);
    }
  }, []);

  const fetchBoard = useCallback(async (pipelineId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/pipeline/${pipelineId}/board`);
      setStages(res.data.stages || []);
    } catch {
      setError('Could not load the board');
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  useEffect(() => {
    if (activePipelineId) fetchBoard(activePipelineId);
  }, [activePipelineId, fetchBoard]);

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;
    try {
      const res = await api.post('/pipeline', { name: newPipelineName.trim() });
      setPipelines((prev) => [...prev, res.data]);
      setActivePipelineId(res.data.id);
      setCreatingPipeline(false);
      setNewPipelineName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create pipeline');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = stages.flatMap((s) => s.deals).find((d) => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;

    const dealId = String(active.id);
    const toStageId = String(over.id);
    const fromStage = stages.find((s) => s.deals.some((d) => d.id === dealId));
    if (!fromStage || fromStage.id === toStageId) return;

    const deal = fromStage.deals.find((d) => d.id === dealId)!;
    const snapshot = stages;

    // Move optimistically — the board should feel instant.
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === fromStage.id) {
          return {
            ...s,
            deals: s.deals.filter((d) => d.id !== dealId),
            totalValue: s.totalValue - deal.value,
          };
        }
        if (s.id === toStageId) {
          return { ...s, deals: [deal, ...s.deals], totalValue: s.totalValue + deal.value };
        }
        return s;
      })
    );

    try {
      await api.patch(`/deals/${dealId}/move`, { stageId: toStageId });
    } catch (err: any) {
      setStages(snapshot);
      setError(err.response?.data?.error || 'Could not move the deal');
    }
  };

  const handleStatus = async (deal: Deal, status: 'won' | 'lost') => {
    const snapshot = stages;
    // Closed deals leave the board — getBoard only returns open ones.
    setStages((prev) =>
      prev.map((s) => ({
        ...s,
        deals: s.deals.filter((d) => d.id !== deal.id),
        totalValue: s.deals.some((d) => d.id === deal.id) ? s.totalValue - deal.value : s.totalValue,
      }))
    );
    try {
      await api.patch(`/deals/${deal.id}/status`, { status });
    } catch (err: any) {
      setStages(snapshot);
      setError(err.response?.data?.error || 'Could not update the deal');
    }
  };

  const totalPipelineValue = stages.reduce((sum, s) => sum + s.totalValue, 0);
  const totalDeals = stages.reduce((sum, s) => sum + s.deals.length, 0);

  return (
    <div className="space-y-5">
      {showNewDeal && (
        <NewDealModal
          stages={stages}
          onClose={() => setShowNewDeal(false)}
          onCreated={() => activePipelineId && fetchBoard(activePipelineId)}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-slate-500 text-sm mt-1">
            {totalDeals} open {totalDeals === 1 ? 'deal' : 'deals'} · {formatMoney(totalPipelineValue)} total
          </p>
        </div>
        <div className="flex gap-2">
          {stages.length > 0 && (
            <button
              onClick={() => setShowNewDeal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-brand-200"
            >
              <IndianRupee className="w-4 h-4" />
              New Deal
            </button>
          )}
          <button
            onClick={() => setCreatingPipeline(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Pipeline
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {creatingPipeline && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <form onSubmit={handleCreatePipeline} className="flex items-center gap-3">
            <input
              autoFocus
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="Pipeline name (e.g. Q2 Healthcare)"
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreatingPipeline(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {pipelines.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePipelineId(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activePipelineId === p.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && pipelines.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-700 font-semibold text-lg">No pipelines yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            Create a pipeline to start tracking deals through stages
          </p>
          <button
            onClick={() => setCreatingPipeline(true)}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Create Pipeline
          </button>
        </div>
      )}

      {!loading && stages.length > 0 && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {stages.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  onWin={(deal) => handleStatus(deal, 'won')}
                  onLose={(deal) => handleStatus(deal, 'lost')}
                />
              ))}
            </div>
          </div>
          <DragOverlay>{activeDeal && <DealCard deal={activeDeal} dragging />}</DragOverlay>
        </DndContext>
      )}

      {!loading && pipelines.length > 0 && totalDeals === 0 && stages.length > 0 && (
        <p className="text-center text-sm text-slate-400">
          No open deals yet.{' '}
          <button onClick={() => setShowNewDeal(true)} className="text-brand-600 font-medium hover:underline">
            Create your first deal
          </button>{' '}
          or <Link href="/leads" className="text-brand-600 font-medium hover:underline">pick a lead</Link>.
        </p>
      )}
    </div>
  );
}
