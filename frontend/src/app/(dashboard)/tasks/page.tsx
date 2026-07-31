'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Circle, Plus, Trash2, Clock, AlertTriangle, X, Building2, ListTodo,
} from 'lucide-react';
import api from '@/lib/api';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignedTo?: { id: string; user: { id: string; name?: string | null; email: string } } | null;
  lead?: { id: string; companyName: string } | null;
  deal?: { id: string; title: string } | null;
}

interface Member {
  id: string;
  user: { id: string; name?: string | null; email: string };
}

const FILTERS = [
  { key: 'all', label: 'All open' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'today', label: 'Due today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const isOverdue = (task: Task) =>
  task.status !== 'completed' && task.dueDate ? new Date(task.dueDate) < new Date() : false;

const formatDue = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedToId, setAssignedToId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter === 'completed') params.status = 'completed';
      else if (filter === 'all') params.status = 'open';
      else {
        params.scope = filter;
        if (filter === 'mine') params.status = 'open';
      }

      const res = await api.get('/tasks', { params });
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    api
      .get('/team')
      .then((res) => setMembers(res.data.members || res.data || []))
      .catch(() => setMembers([]));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: title.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        assignedToId: assignedToId || undefined,
      });
      setTitle('');
      setDueDate('');
      setPriority('medium');
      setAssignedToId('');
      setShowForm(false);
      await fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not create the task');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (task: Task) => {
    const next = task.status === 'completed' ? 'open' : 'completed';
    // Optimistic: the row usually leaves the current filter straight away.
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: next });
    } catch {
      setError('Could not update the task');
      await fetchTasks();
    }
  };

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/tasks/${id}`);
    } catch {
      setError('Could not delete the task');
      await fetchTasks();
    }
  };

  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm mt-1">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            {overdueCount > 0 && (
              <span className="text-red-600 font-medium"> · {overdueCount} overdue</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-brand-200"
        >
          <Plus className="w-4 h-4" />
          New Task
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

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Assign to me</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.user.name || m.user.email}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ListTodo className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-700 font-semibold">Nothing here</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'completed' ? 'No completed tasks yet.' : 'You are all caught up.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-4 group hover:bg-slate-50/70 transition-colors">
              <button onClick={() => handleToggle(task)} className="flex-shrink-0 mt-0.5">
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 hover:text-brand-500 transition-colors" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                )}

                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                    {task.priority}
                  </span>

                  {task.dueDate && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                      {isOverdue(task) ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {formatDue(task.dueDate)}
                    </span>
                  )}

                  {task.lead && (
                    <Link
                      href={`/leads/${task.lead.id}`}
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                    >
                      <Building2 className="w-3 h-3" />
                      {task.lead.companyName}
                    </Link>
                  )}

                  {task.assignedTo && (
                    <span className="text-xs text-slate-400">
                      {task.assignedTo.user.name || task.assignedTo.user.email}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(task.id)}
                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
