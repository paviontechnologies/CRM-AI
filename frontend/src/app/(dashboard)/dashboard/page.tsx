'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Zap,
  MessageSquare,
  TrendingUp,
  Activity,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Building2,
  MapPin,
  Tag,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import api from '@/lib/api';
import Link from 'next/link';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const QUICK_GENERATE_CONFIGS = [
  { industry: 'Construction & Real Estate', city: 'Mumbai', label: 'CRM — Construction Mumbai' },
  { industry: 'Manufacturing', city: 'Pune', label: 'ERP — Manufacturing Pune' },
  { industry: 'Healthcare', city: 'Bangalore', label: 'AI — Healthcare Bangalore' },
  { industry: 'Retail', city: 'Delhi', label: 'CRM — Retail Delhi' },
  { industry: 'Logistics', city: 'Hyderabad', label: 'ERP — Logistics Hyderabad' },
  { industry: 'IT Services', city: 'Chennai', label: 'AI — IT Services Chennai' },
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
  id: string;
  companyName: string;
  contactName: string;
  industry: string;
  city: string;
  country: string;
  intentScore: number;
  icpScore: number;
  status: string;
  priority: string;
  notes: string;
  tags: string;
  createdAt: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    normal: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[priority] ?? map.normal}`}>
      {priority}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-blue-500' : 'bg-gray-400';
  return (
    <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
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
    setGenerateMsg(`AI is finding ${config.industry} companies in ${config.city}...`);
    try {
      const res = await api.post('/leads/generate', {
        industry: config.industry,
        city: config.city,
        country: 'India',
        count: 5,
      });
      const count = res.data?.created ?? res.data?.leads?.length ?? 0;
      setGenerateMsg(`${count} new ${config.industry} leads added!`);
      await fetchDashboard();
      setTimeout(() => setGenerateMsg(''), 4000);
    } catch {
      setGenerateMsg('Generation failed. Try again.');
      setTimeout(() => setGenerateMsg(''), 3000);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Pavion Technologies — Lead Intelligence Platform</p>
        </div>
        <Link
          href="/leads"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          All Leads
        </Link>
      </div>

      {/* AI Lead Finder Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-black text-lg">AI Lead Finder</span>
            </div>
            <p className="text-blue-100 text-sm mb-4">
              Instantly generate CRM, ERP & AI automation buyer leads for Indian markets. One click — real companies, real contacts.
            </p>

            {generateMsg && (
              <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-medium mb-3 flex items-center gap-2">
                {generating && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                {generateMsg}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {QUICK_GENERATE_CONFIGS.map((cfg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickGenerate(cfg, idx)}
                  disabled={generating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    generating && activeConfig === idx
                      ? 'bg-white text-blue-700 shadow-lg'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {generating && activeConfig === idx ? (
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center bg-white/10 rounded-xl p-4 min-w-[120px] text-center">
            <div className="text-3xl font-black">{stats?.totalLeads ?? 0}</div>
            <div className="text-xs text-blue-200 mt-1">Total Leads</div>
            <div className="text-xs text-yellow-300 font-semibold mt-1">
              {stats?.hotLeads ?? 0} hot
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads ?? 0}
          subtitle={`+${stats?.thisWeekLeads ?? 0} this week`}
          icon={Users}
          color="bg-blue-600"
        />
        <StatCard
          title="Hot Leads"
          value={stats?.hotLeads ?? 0}
          subtitle="Score ≥ 80"
          icon={Zap}
          color="bg-orange-500"
        />
        <StatCard
          title="Campaigns"
          value={stats?.campaigns ?? 0}
          subtitle="Active sequences"
          icon={MessageSquare}
          color="bg-indigo-600"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats?.conversionRate ?? 0}%`}
          subtitle="Leads → Closed"
          icon={TrendingUp}
          color="bg-emerald-600"
        />
      </div>

      {/* Hot Leads & Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Leads */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" /> Hot Leads
            </h3>
            <Link href="/leads?priority=high" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {hotLeads.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No hot leads yet — use AI Lead Finder above
              </div>
            ) : (
              hotLeads.map((lead) => (
                <div key={lead.id} className="px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5">
                        {lead.companyName?.charAt(0)?.toUpperCase() ?? 'L'}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block">
                          {lead.companyName}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {lead.industry}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lead.city}
                          </span>
                        </div>
                        {lead.notes && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{lead.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <ScoreBadge score={lead.intentScore} />
                      <PriorityBadge priority={lead.priority} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Added */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" /> Recently Added
            </h3>
            <Link href="/leads" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLeads.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No leads yet — generate some above
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5">
                        {lead.companyName?.charAt(0)?.toUpperCase() ?? 'L'}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block">
                          {lead.companyName}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {lead.industry}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lead.city}
                          </span>
                        </div>
                        {lead.tags && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Tag className="w-3 h-3 text-gray-300" />
                            {lead.tags.split(',').slice(0, 3).map((tag: string) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <ScoreBadge score={lead.intentScore} />
                      <span className="text-xs text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Leads This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorLeads)" dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Leads by Source</h3>
          {sourceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                    {sourceData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {sourceData.slice(0, 4).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 flex-1 capitalize truncate">{s.source || 'unknown'}</span>
                    <span className="font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No source data yet</div>
          )}
        </div>
      </div>

      {/* Status funnel + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Pipeline Funnel</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No pipeline data yet</div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {activities.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">No activity yet</p>
            )}
            {activities.slice(0, 6).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-3 h-3 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{a.type}</p>
                  <p className="text-xs text-gray-400">
                    {a.notes || ''} · {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
