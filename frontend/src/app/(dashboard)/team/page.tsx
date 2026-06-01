'use client';
import { useEffect, useState } from 'react';
import { UserPlus, Trash2, X, Shield, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

interface TeamMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'SUPERADMIN';
  joinedAt?: string;
  createdAt?: string;
}

const ROLES = ['ADMIN', 'MANAGER', 'AGENT'] as const;
type RoleType = typeof ROLES[number];

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    MANAGER: 'bg-green-100 text-green-700',
    AGENT: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${map[role] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('AGENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/team/invite', { email, role });
      setSuccess(`Invitation sent to ${email}`);
      setTimeout(() => {
        onInvited();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Invite Team Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleType)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              {role === 'ADMIN' && 'Full access to all features including billing and team management.'}
              {role === 'MANAGER' && 'Can manage leads, campaigns and view analytics. Cannot change billing.'}
              {role === 'AGENT' && 'Can view and update leads and campaigns. Limited access.'}
            </p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      const res = await api.get('/team');
      setMembers(Array.isArray(res.data) ? res.data : res.data.members || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setRoleChanging(memberId);
    try {
      await api.patch(`/team/${memberId}/role`, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole as any } : m))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role');
    } finally {
      setRoleChanging(null);
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name || 'this member'} from the team?`)) return;
    setDeletingId(memberId);
    try {
      await api.delete(`/team/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={fetchTeam}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Team</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your workspace members and permissions</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Members', value: members.length, color: 'text-gray-900' },
          { label: 'Admins', value: members.filter(m => m.role === 'ADMIN' || m.role === 'SUPERADMIN').length, color: 'text-blue-600' },
          { label: 'Agents', value: members.filter(m => m.role === 'AGENT').length, color: 'text-gray-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold">No team members yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Invite colleagues to collaborate on leads and campaigns</p>
            <button
              onClick={() => setShowInvite(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Invite First Member
            </button>
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 group transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {member.user?.name?.charAt(0)?.toUpperCase() || member.user?.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{member.user?.name || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{member.user?.email}</td>
                  <td className="px-5 py-4">
                    {member.role === 'SUPERADMIN' ? (
                      <RoleBadge role={member.role} />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          disabled={roleChanging === member.id}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {roleChanging === member.id && (
                          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {member.joinedAt || member.createdAt
                      ? new Date(member.joinedAt || member.createdAt || '').toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    {member.role !== 'SUPERADMIN' && (
                      <button
                        onClick={() => handleRemove(member.id, member.user?.name || member.user?.email)}
                        disabled={deletingId === member.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        {deletingId === member.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
