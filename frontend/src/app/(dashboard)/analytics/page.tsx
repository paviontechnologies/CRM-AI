'use client';
import { useEffect, useState } from 'react';
import {
  Users,
  Zap,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '@/lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

function KPICard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [source, setSource] = useState<any[]>([]);
  const [status, setStatus] = useState<any[]>([]);
  const [industry, setIndustry] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/leads/weekly'),
      api.get('/analytics/leads/source'),
      api.get('/analytics/leads/status'),
      api.get('/analytics/leads/industry'),
      api.get('/analytics/campaigns'),
      api.get('/analytics/activities'),
    ])
      .then(([d, w, s, st, ind, c, a]) => {
        setDashboard(d.data);
        setWeekly(w.data);
        setSource(s.data);
        setStatus(st.data);
        setIndustry(ind.data);
        setCampaigns(c.data);
        setActivities(a.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time performance insights across your entire pipeline</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Leads" value={dashboard?.totalLeads ?? 0} subtitle={`+${dashboard?.thisWeekLeads ?? 0} this week`} icon={Users} color="bg-blue-600" />
        <KPICard title="Hot Leads" value={dashboard?.hotLeads ?? 0} subtitle="Score ≥ 80" icon={Zap} color="bg-orange-500" />
        <KPICard title="Reply Rate" value={`${dashboard?.replyRate ?? 0}%`} subtitle="Across all campaigns" icon={MessageSquare} color="bg-indigo-600" />
        <KPICard title="Conversion" value={`${dashboard?.conversionRate ?? 0}%`} subtitle="Leads → Closed Won" icon={TrendingUp} color="bg-emerald-600" />
      </div>

      {/* Weekly trend + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Weekly Lead Acquisition</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="count" name="Leads" stroke="#3b82f6" strokeWidth={2.5} fill="url(#grad1)" dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Leads by Source</h3>
          {source.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={source} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="count">
                    {source.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {source.slice(0, 5).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 flex-1 capitalize truncate">{s.source || 'unknown'}</span>
                    <span className="font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Industry + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Leads by Industry</h3>
          {industry.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={industry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="industry" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No industry data</div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Pipeline Status Distribution</h3>
          {status.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={status} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No status data</div>
          )}
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-gray-900">Campaign Performance</h3>
        </div>
        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No campaign data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Enrolled</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Sent</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Replies</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Reply Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map((c: any) => {
                  const rate = c.sentCount > 0 ? Math.round((c.replyCount / c.sentCount) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 font-semibold text-gray-900 text-sm">{c.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-1 text-xs rounded-lg font-medium capitalize ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' :
                          c.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-700'
                        }`}>{c.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 text-right">{c.enrolledCount || 0}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 text-right">{c.sentCount || 0}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 text-right">{c.replyCount || 0}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-sm font-bold ${rate >= 15 ? 'text-green-600' : rate >= 5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" /> Activity Timeline
        </h3>
        {activities.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No activity recorded yet</p>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 10).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">{a.type}</p>
                  {a.notes && <p className="text-xs text-gray-400 mt-0.5">{a.notes}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
