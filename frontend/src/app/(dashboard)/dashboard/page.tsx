'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Zap, MessageSquare, TrendingUp, Activity, Sparkles, RefreshCw,
  ArrowRight, Building2, MapPin, Tag,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import api from '@/lib/api';
import Link from 'next/link';
import { PageHeader, StatCard, Card, CardHeader, Badge, Button, PageLoader } from '@/components/ui';

// Restrained categorical palette — brand-led, no rainbow.
const CHART = {
  brand: '#4f46e5',
  series: ['#4f46e5', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#64748b'],
  grid: '#eef2f6',
  axis: '#94a3b8',
};

const QUICK_GENERATE_CONFIGS = [
  { industry: 'Construction & Real Estate', city: 'Mumbai', label: 'Construction · Mumbai' },
  { industry: 'Manufacturing', city: 'Pune', label: 'Manufacturing · Pune' },
  { industry: 'Healthcare', city: 'Bangalore', label: 'Healthcare · Bangalore' },
  { industry: 'Retail', city: 'Delhi', label: 'Retail · Delhi' },
  { industry: 'Logistics', city: 'Hyderabad', label: 'Logistics · Hyderabad' },
  { industry: 'IT Services', city: 'Chennai', label: 'IT Services · Chennai' },
];

interface Stats {
  totalLeads: number;
  hotLeads: number;
  campaigns: number;
  replyRate: number;
  thisWeekLeads: number;
  conversionRate: number;
}

interface Lead {
  id: string; companyName: string; contactName: string; industry: string;
  city: string; country: string; intentScore: number; icpScore: number;
  status: string; priority: string; notes: string; tags: string; createdAt: string;
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 85 ? 'green' : score >= 70 ? 'brand' : 'gray';
  return <Badge tone={tone as any} className="font-semibold tabular-nums">{score || '—'}</Badge>;
}

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)',
  fontSize: '12px',
};

function LeadRow({ lead, accent, meta }: { lead: Lead; accent: string; meta: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 hover:bg-subtle transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-onaccent text-xs font-semibold flex-shrink-0 mt-0.5 ${accent}`}>
            {lead.companyName?.charAt(0)?.toUpperCase() ?? 'L'}
          </div>
          <div className="min-w-0">
            <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-ink hover:text-brand-600 truncate block">
              {lead.companyName}
            </Link>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted">
              {lead.industry && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.industry}</span>}
              {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}</span>}
            </div>
            {meta}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <ScoreBadge score={lead.intentScore} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [hotLeads, setHotLeads] = useState<Lead[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState('');
  const [activeConfig, setActiveConfig] = useState(0);

  const fetchDashboard = useCallback(() => {
    return Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/leads/weekly'),
      api.get('/analytics/leads/source'),
      api.get('/analytics/leads/status'),
      api.get('/analytics/activities'),
      api.get('/leads?limit=6&sortBy=intentScore&sortDir=desc'),
      api.get('/leads?limit=6&sortBy=createdAt&sortDir=desc'),
    ])
      .then(([statsRes, weeklyRes, sourceRes, statusRes, actRes, hotRes, recentRes]) => {
        setStats(statsRes.data);
        setWeeklyData(weeklyRes.data);
        setSourceData(sourceRes.data);
        setStatusData(statusRes.data);
        setActivities(actRes.data);
        const hotItems = hotRes.data?.leads ?? hotRes.data ?? [];
        const recentItems = recentRes.data?.leads ?? recentRes.data ?? [];
        setHotLeads(Array.isArray(hotItems) ? hotItems.slice(0, 6) : []);
        setRecentLeads(Array.isArray(recentItems) ? recentItems.slice(0, 6) : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  const handleQuickGenerate = async (config: typeof QUICK_GENERATE_CONFIGS[0], idx: number) => {
    setGenerating(true);
    setActiveConfig(idx);
    setGenerateMsg(`Finding ${config.industry} companies in ${config.city}…`);
    try {
      const res = await api.post('/leads/generate', {
        industry: config.industry, city: config.city, country: 'India', count: 5,
      });
      const count = res.data?.created ?? res.data?.leads?.length ?? 0;
      setGenerateMsg(`${count} new ${config.industry} leads added.`);
      await fetchDashboard();
      setTimeout(() => setGenerateMsg(''), 4000);
    } catch {
      setGenerateMsg('Generation failed. Try again.');
      setTimeout(() => setGenerateMsg(''), 3000);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your lead intelligence at a glance."
        actions={
          <Link href="/leads">
            <Button variant="secondary" icon={<Users className="w-4 h-4" />}>All leads</Button>
          </Link>
        }
      />

      {/* AI Lead Finder — single dark hero, brand glow, no rainbow */}
      <div className="relative overflow-hidden rounded-xl bg-field p-6">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(600px circle at 12% 0%, rgba(79,70,229,0.4), transparent 42%), radial-gradient(500px circle at 100% 100%, rgba(139,92,246,0.22), transparent 45%)' }}
        />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-onfield/10 text-onfield/80 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" /> AI Lead Finder
            </div>
            <h2 className="text-onfield text-lg font-semibold">Generate real buyer leads in one click</h2>
            <p className="text-onfield/70 text-sm mt-1 mb-4 max-w-lg">
              Pick a market and the AI finds matching companies with contacts — deduplicated against your existing leads.
            </p>

            {generateMsg && (
              <div className="inline-flex items-center gap-2 bg-onfield/10 rounded-lg px-3 py-1.5 text-sm text-onfield font-medium mb-3">
                {generating && <div className="w-3.5 h-3.5 border-2 border-onfield/60 border-t-transparent rounded-full animate-spin" />}
                {generateMsg}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {QUICK_GENERATE_CONFIGS.map((cfg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickGenerate(cfg, idx)}
                  disabled={generating}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    generating && activeConfig === idx ? 'bg-surface text-brand-700' : 'bg-surface/10 hover:bg-surface/20 text-slate-200'
                  }`}
                >
                  {generating && activeConfig === idx
                    ? <div className="w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                    : <Zap className="w-3 h-3" />}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center bg-surface/[0.07] border border-white/10 rounded-xl px-5 py-4 min-w-[130px] text-center">
            <div className="text-3xl font-semibold text-onaccent tabular-nums">{stats?.totalLeads ?? 0}</div>
            <div className="text-xs text-faint mt-1">Total leads</div>
            <div className="text-xs text-emerald-400 font-semibold mt-1.5">{stats?.hotLeads ?? 0} hot</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total leads" value={stats?.totalLeads ?? 0} hint={`+${stats?.thisWeekLeads ?? 0} this week`} icon={<Users className="w-5 h-5" />} tone="brand" />
        <StatCard label="Hot leads" value={stats?.hotLeads ?? 0} hint="Score ≥ 80" icon={<Zap className="w-5 h-5" />} tone="amber" />
        <StatCard label="Campaigns" value={stats?.campaigns ?? 0} hint="Active sequences" icon={<MessageSquare className="w-5 h-5" />} tone="purple" />
        <StatCard label="Conversion" value={`${stats?.conversionRate ?? 0}%`} hint="Leads → closed" icon={<TrendingUp className="w-5 h-5" />} tone="green" />
      </div>

      {/* Hot & Recent leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader
            title="Hot leads"
            icon={<Zap className="w-4 h-4 text-amber-500" />}
            action={<Link href="/leads?priority=high" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>}
          />
          <div className="divide-y divide-line">
            {hotLeads.length === 0
              ? <div className="px-6 py-10 text-center text-faint text-sm">No hot leads yet — use AI Lead Finder above.</div>
              : hotLeads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} accent="bg-accent"
                    meta={lead.notes ? <p className="text-xs text-faint mt-1 line-clamp-1">{lead.notes}</p> : null} />
                ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Recently added"
            icon={<RefreshCw className="w-4 h-4 text-brand-500" />}
            action={<Link href="/leads" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>}
          />
          <div className="divide-y divide-line">
            {recentLeads.length === 0
              ? <div className="px-6 py-10 text-center text-faint text-sm">No leads yet — generate some above.</div>
              : recentLeads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} accent="bg-muted"
                    meta={lead.tags ? (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Tag className="w-3 h-3 text-faint" />
                        {lead.tags.split(',').slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-xs bg-subtle text-muted px-1.5 py-0.5 rounded">{tag.trim()}</span>
                        ))}
                      </div>
                    ) : null} />
                ))}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-ink mb-5">Leads this week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.brand} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={CHART.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke={CHART.brand} strokeWidth={2.5} fill="url(#colorLeads)" dot={{ fill: CHART.brand, strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-ink mb-5">Leads by source</h3>
          {sourceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                    {sourceData.map((_: any, i: number) => <Cell key={i} fill={CHART.series[i % CHART.series.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {sourceData.slice(0, 4).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART.series[i % CHART.series.length] }} />
                    <span className="text-muted flex-1 capitalize truncate">{s.source || 'unknown'}</span>
                    <span className="font-semibold text-ink tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="flex items-center justify-center h-48 text-faint text-sm">No source data yet</div>}
        </Card>
      </div>

      {/* Funnel + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-ink mb-5">Pipeline funnel</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={92} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill={CHART.brand} radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-48 text-faint text-sm">No pipeline data yet</div>}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-ink mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-600" /> Recent activity
          </h3>
          <div className="space-y-1">
            {activities.length === 0 && <p className="text-faint text-sm text-center py-8">No activity yet</p>}
            {activities.slice(0, 7).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 py-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{a.notes || a.type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-faint mt-0.5">
                    {a.type?.replace(/_/g, ' ')} · {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
