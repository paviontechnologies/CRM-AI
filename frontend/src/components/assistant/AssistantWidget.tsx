'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X, Send, ArrowUpRight, Loader2, Check, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface Action {
  tool: string;
  ok: boolean;
  summary: string;
  link?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: Action[];
  error?: boolean;
}

const SUGGESTIONS = [
  'Show my leads that need follow-up',
  'Score the highest-intent lead I have',
  'Create a task to call my newest lead tomorrow',
  "What's the total value in my pipeline?",
];

const prettyTool = (tool: string) =>
  tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function AssistantWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      // Send only the plain-text turns; the backend runs the tool loop internally.
      const payload = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.post('/assistant/chat', { messages: payload });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.reply, actions: res.data.actions || [] },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err.response?.data?.error && typeof err.response.data.error === 'string'
              ? err.response.data.error
              : 'Something went wrong. Please try again.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const goTo = (link: string) => {
    setOpen(false);
    router.push(link);
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 pl-4 pr-5 py-3 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-900/30 hover:shadow-xl hover:scale-105 transition-all"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold">Ask AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm leading-none">AI Assistant</p>
                <p className="text-xs text-blue-100 mt-0.5">Ask, or tell me what to do</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-100 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">How can I help?</p>
                  <p className="text-xs text-gray-500 mt-1 px-4">
                    I can search leads, score them, draft outreach, and create tasks or deals — just ask.
                  </p>
                </div>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl text-sm text-gray-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${m.role === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : m.error
                          ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Action chips */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.actions.map((a, j) => (
                        <div
                          key={j}
                          className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${
                            a.ok
                              ? 'bg-green-50 border-green-100 text-green-800'
                              : 'bg-amber-50 border-amber-100 text-amber-800'
                          }`}
                        >
                          {a.ok ? (
                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="font-semibold">{prettyTool(a.tool)}</span>
                            {' — '}
                            {a.summary}
                          </span>
                          {a.link && (
                            <button
                              onClick={() => goTo(a.link!)}
                              className="flex-shrink-0 hover:text-blue-600 transition-colors"
                              aria-label="Open"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  <span className="text-xs text-gray-400">Working on it…</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Message the assistant…"
                className="flex-1 bg-transparent text-sm text-gray-800 focus:outline-none resize-none max-h-24 py-1"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              The assistant can take real actions in your CRM.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
