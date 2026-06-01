'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, Building2, BarChart3, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface SystemStats { totalUsers: number; totalOrgs: number; totalLeads: number; totalCampaigns: number; totalMessages: number; }
interface OrgRow { id: string; name: string; subscription: string | null; _count: { members: number; leads: number }; }
interface UserRow { id: string; email: string; name: string | null; createdAt: string; teamMembers: { role: string; organization: { name: string } }[]; }
interface Template { id: string; name: string; niche: string; channel: string; subject: string | null; content: string; }

function StatCard({ icon: Icon, title, value, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-black text-gray-900">{value?.toLocaleString() ?? 0}</div>
      <div className="text-sm text-gray-500 mt-0.5">{title}</div>
    </div>
  );
}

export default function AdminPage() {
  const { role } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'orgs' | 'users' | 'templates'>('overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Template form
  const [showTplForm, setShowTplForm] = useState(false);
  const [editingTpl, setEditingTpl] = useState<Template | null>(null);
  const [tplForm, setTplForm] = useState({ name: '', niche: '', channel: 'email', subject: '', content: '' });

  useEffect(() => {
    if (role && role !== 'SUPERADMIN') router.replace('/dashboard');
  }, [role]);

  useEffect(() => {
    if (role !== 'SUPERADMIN') return;
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/orgs'),
      api.get('/admin/users'),
      api.get('/admin/templates'),
    ]).then(([s, o, u, t]) => {
      setStats(s.data);
      setOrgs(o.data);
      setUsers(u.data);
      setTemplates(t.data);
    }).finally(() => setLoading(false));
  }, [role]);

  const saveTpl = async () => {
    try {
      if (editingTpl) {
        const res = await api.put(`/admin/templates/${editingTpl.id}`, tplForm);
        setTemplates(ts => ts.map(t => t.id === editingTpl.id ? res.data : t));
      } else {
        const res = await api.post('/admin/templates', tplForm);
        setTemplates(ts => [...ts, res.data]);
      }
      setShowTplForm(false); setEditingTpl(null);
      setTplForm({ name: '', niche: '', channel: 'email', subject: '', content: '' });
    } catch (err: any) { alert(err.response?.data?.error || 'Save failed'); }
  };

  const deleteTpl = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/admin/templates/${id}`);
    setTemplates(ts => ts.filter(t => t.id !== id));
  };

  const openEdit = (tpl: Template) => {
    setEditingTpl(tpl);
    setTplForm({ name: tpl.name, niche: tpl.niche, channel: tpl.channel, subject: tpl.subject || '', content: tpl.content });
    setShowTplForm(true);
  };

  if (role !== 'SUPERADMIN') return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'orgs', label: `Organizations (${orgs.length})` },
    { id: 'users', label: `Users (${users.length})` },
    { id: 'templates', label: `Templates (${templates.length})` },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm">System management and monitoring</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && tab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Users} title="Total Users" value={stats?.totalUsers} color="bg-blue-600" />
          <StatCard icon={Building2} title="Organizations" value={stats?.totalOrgs} color="bg-indigo-600" />
          <StatCard icon={BarChart3} title="Total Leads" value={stats?.totalLeads} color="bg-emerald-600" />
          <StatCard icon={BarChart3} title="Campaigns" value={stats?.totalCampaigns} color="bg-orange-500" />
          <StatCard icon={BarChart3} title="Messages" value={stats?.totalMessages} color="bg-purple-600" />
        </div>
      )}

      {!loading && tab === 'orgs' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Organization', 'Plan', 'Members', 'Leads', 'Created'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orgs.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{o.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      o.subscription === 'agency' ? 'bg-purple-100 text-purple-700' :
                      o.subscription === 'growth' ? 'bg-blue-100 text-blue-700' :
                      o.subscription === 'starter' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{o.subscription || 'free'}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{o._count?.members ?? 0}</td>
                  <td className="px-6 py-4 text-gray-600">{o._count?.leads ?? 0}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orgs.length === 0 && <p className="text-center py-8 text-gray-400">No organizations yet</p>}
        </div>
      )}

      {!loading && tab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['User', 'Email', 'Organization', 'Role', 'Joined'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const member = u.teamMembers?.[0];
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-gray-600">{member?.organization?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        member?.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-700' :
                        member?.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{member?.role || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center py-8 text-gray-400">No users yet</p>}
        </div>
      )}

      {!loading && tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingTpl(null); setTplForm({ name: '', niche: '', channel: 'email', subject: '', content: '' }); setShowTplForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>

          {showTplForm && (
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">{editingTpl ? 'Edit Template' : 'New Template'}</h3>
                <button onClick={() => setShowTplForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                  <input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Niche</label>
                  <input value={tplForm.niche} onChange={e => setTplForm(f => ({ ...f, niche: e.target.value }))}
                    placeholder="e.g. hospital, restaurant"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Channel</label>
                  <select value={tplForm.channel} onChange={e => setTplForm(f => ({ ...f, channel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>
              {tplForm.channel === 'email' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                  <input value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Content</label>
                <textarea value={tplForm.content} onChange={e => setTplForm(f => ({ ...f, content: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowTplForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                <button onClick={saveTpl} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700">
                  <Check className="w-4 h-4" /> Save Template
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900">{tpl.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">{tpl.channel}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">{tpl.niche}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(tpl)} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTpl(tpl.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {tpl.subject && <p className="text-xs font-semibold text-gray-500 mb-1">Subject: {tpl.subject}</p>}
                <p className="text-sm text-gray-600 line-clamp-3">{tpl.content}</p>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                No templates yet. Create your first niche template.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
