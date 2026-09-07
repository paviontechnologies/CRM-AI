'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin, Users, Sparkles,
  Plus, Trash2, Paperclip, Download, CheckCircle2, Circle, Clock,
  MessageSquare, Activity as ActivityIcon, StickyNote, IndianRupee, X,
} from 'lucide-react';
import api from '@/lib/api';

interface Lead {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  employeeSize?: string | null;
  source?: string | null;
  status: string;
  intentScore?: number | null;
  icpScore?: number | null;
  tags?: string | null;
  createdAt: string;
  assignedTo?: { id: string; user: { id: string; name?: string | null; email: string } } | null;
  scores: { id: string; score: number; reasons: string; recommendation?: string | null; createdAt: string }[];
  activities: { id: string; type: string; notes?: string | null; createdAt: string }[];
  messages: { id: string; direction: string; channel: string; subject?: string | null; body: string; status: string; createdAt: string }[];
  deals: { id: string; title: string; value: number; currency: string; status: string; stage: { name: string } }[];
  tasks: { id: string; title: string; status: string; dueDate?: string | null; priority: string }[];
  noteEntries: { id: string; body: string; createdAt: string; author: { id: string; name?: string | null } }[];
  attachments: { id: string; fileName: string; size: number; mimeType: string; createdAt: string }[];
}

const STATUSES = ['NEW', 'QUALIFIED', 'CONTACTED', 'REPLIED', 'MEETING_BOOKED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'];

const TABS = [
  { key: 'activity', label: 'Activity', icon: ActivityIcon },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'files', label: 'Files', icon: Paperclip },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function ScoreRing({ score, label }: { score?: number | null; label: string }) {
  if (score === null || score === undefined) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full border-4 border-line flex items-center justify-center text-faint text-sm font-semibold">
          —
        </div>
        <p className="text-xs text-faint mt-1.5">{label}</p>
      </div>
    );
  }
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-semibold"
        style={{ border: `4px solid ${color}`, color }}
      >
        {score}
      </div>
      <p className="text-xs text-faint mt-1.5">{label}</p>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('activity');
  const [scoring, setScoring] = useState(false);

  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data);
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Lead not found' : 'Could not load this lead');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const handleStatusChange = async (status: string) => {
    if (!lead) return;
    const previous = lead.status;
    setLead({ ...lead, status });
    try {
      await api.patch(`/leads/${lead.id}/status`, { status });
      fetchLead();
    } catch {
      setLead({ ...lead, status: previous });
      setError('Could not update status');
    }
  };

  const handleScore = async () => {
    setScoring(true);
    try {
      await api.post(`/leads/${leadId}/score`);
      await fetchLead();
    } catch (err: any) {
      setError(err.response?.data?.error || 'AI scoring failed');
    } finally {
      setScoring(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setSavingNote(true);
    try {
      await api.post('/notes', { body: noteBody.trim(), leadId });
      setNoteBody('');
      await fetchLead();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save the note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.delete(`/notes/${id}`);
      await fetchLead();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not delete the note');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await api.post('/tasks', {
        title: taskTitle.trim(),
        leadId,
        dueDate: taskDue ? new Date(taskDue).toISOString() : undefined,
      });
      setTaskTitle('');
      setTaskDue('');
      setShowTaskForm(false);
      await fetchLead();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not create the task');
    }
  };

  const handleToggleTask = async (taskId: string, current: string) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, {
        status: current === 'completed' ? 'open' : 'completed',
      });
      await fetchLead();
    } catch {
      setError('Could not update the task');
    }
  };

  const handleLogReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSavingReply(true);
    try {
      await api.post(`/leads/${leadId}/reply`, {
        body: replyBody.trim(),
        subject: replySubject.trim() || undefined,
      });
      setReplyBody('');
      setReplySubject('');
      setShowReplyForm(false);
      await fetchLead();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not log the reply');
    } finally {
      setSavingReply(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('leadId', leadId);
    try {
      await api.post('/attachments', form);
      await fetchLead();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await api.get(`/attachments/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await api.delete(`/attachments/${id}`);
      await fetchLead();
    } catch {
      setError('Could not delete the file');
    }
  };

  const handleDeleteLead = async () => {
    if (!confirm('Delete this lead? It will be removed from your lists.')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      router.push('/leads');
    } catch {
      setError('Could not delete the lead');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-ink font-semibold text-lg">{error || 'Lead not found'}</p>
        <Link href="/leads" className="text-brand-600 text-sm font-medium hover:underline mt-2 inline-block">
          Back to leads
        </Link>
      </div>
    );
  }

  const openTasks = lead.tasks.filter((t) => t.status !== 'completed');

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <Link href="/leads" className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to leads
        </Link>
        <button
          onClick={handleDeleteLead}
          className="flex items-center gap-1.5 text-sm text-faint hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header card */}
      <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-onaccent font-semibold text-xl flex-shrink-0">
            {lead.companyName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{lead.companyName}</h1>
            {lead.contactName && <p className="text-muted text-sm mt-0.5">{lead.contactName}</p>}

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-faint" />{lead.email}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-faint" />{lead.phone}
                </a>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                  <Globe className="w-3.5 h-3.5 text-faint" />Website
                </a>
              )}
              {lead.industry && (
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-faint" />{lead.industry}</span>
              )}
              {lead.city && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-faint" />{lead.city}</span>
              )}
              {lead.employeeSize && (
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-faint" />{lead.employeeSize}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 border border-line rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>

              <button
                onClick={handleScore}
                disabled={scoring}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {scoring ? 'Scoring…' : 'AI Score'}
              </button>

              {lead.assignedTo && (
                <span className="text-xs text-faint">
                  Owner: {lead.assignedTo.user.name || lead.assignedTo.user.email}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <ScoreRing score={lead.intentScore} label="Intent" />
            <ScoreRing score={lead.icpScore} label="ICP" />
          </div>
        </div>

        {lead.scores[0]?.recommendation && (
          <div className="mt-5 bg-brand-50 border border-brand-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-900 uppercase tracking-wide mb-1">AI Recommendation</p>
            <p className="text-sm text-brand-800">{lead.scores[0].recommendation}</p>
            {lead.scores[0].reasons && (
              <p className="text-xs text-brand-600 mt-2">{lead.scores[0].reasons}</p>
            )}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open deals', value: lead.deals.filter((d) => d.status === 'open').length, icon: IndianRupee },
          { label: 'Open tasks', value: openTasks.length, icon: CheckCircle2 },
          { label: 'Messages', value: lead.messages.length, icon: MessageSquare },
          { label: 'Files', value: lead.attachments.length, icon: Paperclip },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface rounded-xl border border-line p-4">
            <stat.icon className="w-4 h-4 text-faint mb-2" />
            <p className="text-2xl font-semibold text-ink">{stat.value}</p>
            <p className="text-xs text-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Deals */}
      {lead.deals.length > 0 && (
        <div className="bg-surface rounded-2xl border border-line p-5 shadow-sm">
          <h2 className="font-semibold text-ink mb-3">Deals</h2>
          <div className="space-y-2">
            {lead.deals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between p-3 bg-subtle rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{deal.title}</p>
                  <p className="text-xs text-muted mt-0.5">{deal.stage.name}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-semibold text-ink">
                    ₹{deal.value.toLocaleString('en-IN')}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      deal.status === 'won' ? 'text-green-600' : deal.status === 'lost' ? 'text-red-500' : 'text-faint'
                    }`}
                  >
                    {deal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key
                  ? 'border-brand-600 text-brand-700 bg-brand-50/50'
                  : 'border-transparent text-muted hover:text-ink hover:bg-subtle'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'activity' && (
            <div className="space-y-3">
              {lead.activities.length === 0 && (
                <p className="text-sm text-faint text-center py-8">No activity recorded yet.</p>
              )}
              {lead.activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1 pb-3 border-b border-slate-50 last:border-0">
                    <p className="text-sm text-ink">{a.notes || a.type}</p>
                    <p className="text-xs text-faint mt-0.5">
                      {a.type.replace(/_/g, ' ')} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Add a note about this lead…"
                  rows={3}
                  className="w-full px-4 py-3 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={!noteBody.trim() || savingNote}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-onaccent rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {savingNote ? 'Saving…' : 'Add Note'}
                </button>
              </form>

              {lead.noteEntries.length === 0 && (
                <p className="text-sm text-faint text-center py-6">No notes yet.</p>
              )}
              {lead.noteEntries.map((n) => (
                <div key={n.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink whitespace-pre-wrap flex-1">{n.body}</p>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="text-amber-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    {n.author.name || 'Unknown'} · {formatDate(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-3">
              {showTaskForm ? (
                <form onSubmit={handleAddTask} className="flex gap-2 flex-wrap">
                  <input
                    autoFocus
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task title…"
                    className="flex-1 min-w-48 px-4 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="px-4 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-onaccent rounded-xl text-sm font-semibold transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-4 py-2 bg-subtle hover:bg-line text-ink rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add task
                </button>
              )}

              {lead.tasks.length === 0 && (
                <p className="text-sm text-faint text-center py-6">No tasks for this lead.</p>
              )}
              {lead.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-subtle rounded-xl">
                  <button onClick={() => handleToggleTask(t.id, t.status)} className="flex-shrink-0">
                    {t.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-faint hover:text-brand-500 transition-colors" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${t.status === 'completed' ? 'line-through text-faint' : 'text-ink'}`}>
                      {t.title}
                    </p>
                    {t.dueDate && (
                      <p className="text-xs text-faint mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'messages' && (
            <div className="space-y-3">
              {!showReplyForm && (
                <button
                  onClick={() => setShowReplyForm(true)}
                  className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Log a reply
                </button>
              )}

              {showReplyForm && (
                <form onSubmit={handleLogReply} className="border border-line rounded-xl p-4 space-y-3">
                  <p className="text-xs text-muted">
                    Record a reply you received outside the CRM. This stops any active campaign for
                    this lead and counts toward your reply rate.
                  </p>
                  <input
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder="Subject (optional)"
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={4}
                    placeholder="What did they say?"
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingReply || !replyBody.trim()}
                      className="px-4 py-2 bg-brand-600 text-onaccent rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {savingReply ? 'Saving…' : 'Log reply'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowReplyForm(false); setReplyBody(''); setReplySubject(''); }}
                      className="px-4 py-2 bg-subtle text-ink rounded-lg text-sm font-semibold hover:bg-line transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {lead.messages.length === 0 && (
                <p className="text-sm text-faint text-center py-8">
                  No messages yet. Generate outreach from the leads list.
                </p>
              )}
              {lead.messages.map((m) => (
                <div
                  key={m.id}
                  className={`border rounded-xl p-4 ${
                    m.direction === 'inbound' ? 'border-green-200 bg-green-50/50' : 'border-line'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                      {m.direction} · {m.channel}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.status === 'received'
                          ? 'bg-green-100 text-green-700'
                          : m.status === 'opened'
                            ? 'bg-green-100 text-green-700'
                            : m.status === 'sent'
                              ? 'bg-brand-100 text-brand-700'
                              : m.status === 'failed'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-subtle text-muted'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  {m.subject && <p className="text-sm font-semibold text-ink mb-1">{m.subject}</p>}
                  <p className="text-sm text-muted whitespace-pre-wrap">{m.body}</p>
                  <p className="text-xs text-faint mt-2">{formatDate(m.createdAt)}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'files' && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload file'}
              </button>

              {lead.attachments.length === 0 && (
                <p className="text-sm text-faint text-center py-6">No files attached.</p>
              )}
              {lead.attachments.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-subtle rounded-xl group">
                  <Paperclip className="w-4 h-4 text-faint flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{f.fileName}</p>
                    <p className="text-xs text-faint">{formatBytes(f.size)} · {formatDate(f.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(f.id, f.fileName)}
                    className="text-faint hover:text-brand-600 transition-colors flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(f.id)}
                    className="text-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
