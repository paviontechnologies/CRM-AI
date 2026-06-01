'use client';
import { useState, useEffect } from 'react';
import { User, Building2, Lock, Plug, Save, Check } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <Icon className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button type="submit" disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
      } disabled:opacity-60`}>
      {saved ? <><Check className="w-4 h-4" /> Saved!</> : loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
    </button>
  );
}

export default function SettingsPage() {
  const { user, org, setAuth, token, role } = useAuthStore();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Org
  const [orgName, setOrgName] = useState(org?.name || '');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setOrgName(org?.name || '');
  }, [user, org]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true); setProfileError('');
    try {
      const res = await api.patch('/auth/me', { name });
      const updated = res.data;
      setAuth(token!, { ...user!, name: updated.name }, org!, role!);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to save');
    } finally { setProfileSaving(false); }
  };

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    try {
      await api.patch('/auth/org', { name: orgName });
      setAuth(token!, user!, { ...org!, name: orgName }, role!);
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 2500);
    } catch { /* ignore */ } finally { setOrgSaving(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await api.patch('/auth/password', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Failed to update password');
    } finally { setPwSaving(false); }
  };

  const integrations = [
    { name: 'SendGrid', desc: 'Transactional email delivery', icon: '✉️', connected: false },
    { name: 'Twilio', desc: 'SMS and WhatsApp messaging', icon: '📱', connected: false },
    { name: 'HubSpot', desc: 'CRM sync and pipeline management', icon: '🧡', connected: false },
    { name: 'Salesforce', desc: 'Enterprise CRM integration', icon: '☁️', connected: false },
    { name: 'Meta WhatsApp', desc: 'Official WhatsApp Business API', icon: '💬', connected: false },
    { name: 'Google OAuth', desc: 'Single sign-on via Google', icon: '🔵', connected: false },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your profile, organization and integrations</p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={User}>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input value={user?.email || ''} disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
          </div>
          {profileError && <p className="text-red-600 text-sm">{profileError}</p>}
          <div className="flex justify-end">
            <SaveButton loading={profileSaving} saved={profileSaved} />
          </div>
        </form>
      </Section>

      {/* Organization */}
      <Section title="Organization" icon={Building2}>
        <form onSubmit={saveOrg} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organization Name</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Plan</label>
              <div className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600 capitalize">
                {org?.subscription || 'free'}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <SaveButton loading={orgSaving} saved={orgSaved} />
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section title="Security" icon={Lock}>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repeat password" />
            </div>
          </div>
          {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
          <div className="flex justify-end">
            <SaveButton loading={pwSaving} saved={pwSaved} />
          </div>
        </form>
      </Section>

      {/* Integrations */}
      <Section title="Integrations" icon={Plug}>
        <div className="grid grid-cols-2 gap-4">
          {integrations.map(int => (
            <div key={int.name} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{int.icon}</span>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{int.name}</div>
                  <div className="text-xs text-gray-500">{int.desc}</div>
                </div>
              </div>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                int.connected
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
              }`}>
                {int.connected ? 'Connected' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">Integrations require API keys. Configure them in your .env file or contact support.</p>
      </Section>
    </div>
  );
}
