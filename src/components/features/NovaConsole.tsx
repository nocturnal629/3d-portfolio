'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BsRobot, BsSend, BsX } from 'react-icons/bs';
import { MODE_COPY, starterPrompts } from '@/data/prompts';
import { flyTo } from '@/lib/scroll';
import type { ChatMessage, ChatMode, ChatResponse } from '@/types';

const GREETING: Record<ChatMode, string> = {
  ask: 'NOVA online. I have the full record on Aldrian — roles, projects, stack, certifications. Ask away, and I will steer the ship to whichever part of the system answers you.',
  fit: 'Fit-check mode. Paste a job description and I will grade the match against the record, gaps included.',
};

export default function NovaConsole() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('ask');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    // Pin to the newest message whenever the transcript grows.
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || pending) return;

      const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
      setMessages(next);
      setDraft('');
      setError(null);
      setPending(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next, mode }),
        });

        const payload = (await response.json()) as ChatResponse & { error?: string };

        if (!response.ok) {
          setError(payload.error || 'NOVA could not answer that. Try again shortly.');
          // Drop the unanswered question so a retry does not stack duplicates
          // into the history sent upstream.
          setMessages(messages);
          return;
        }

        setMessages([...next, { role: 'assistant', content: payload.reply }]);
        if (payload.navigate) flyTo(payload.navigate);
      } catch {
        setError('Lost contact with NOVA. Check your connection and try again.');
        setMessages(messages);
      } finally {
        setPending(false);
      }
    },
    [messages, mode, pending],
  );

  const switchMode = (next: ChatMode) => {
    if (next === mode) return;
    setMode(next);
    // The two modes use different system prompts; carrying a transcript
    // across would leave the model reasoning about the wrong task.
    setMessages([]);
    setError(null);
    input.current?.focus();
  };

  const copy = MODE_COPY[mode];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="nova-console"
        className="panel-solid panel-hover fixed bottom-4 right-4 z-40 flex h-12 items-center gap-2.5 rounded-full px-4 text-slate-200 sm:bottom-6 sm:right-6"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-cosmos-pulse rounded-full bg-nova" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-nova/80" />
        </span>
        <BsRobot className="h-4 w-4 text-nova" aria-hidden="true" />
        <span className="font-mono text-xs uppercase tracking-[0.16em]">
          {open ? 'Close' : 'Ask NOVA'}
        </span>
      </button>

      {open && (
        <div
          ref={dialog}
          id="nova-console"
          role="dialog"
          aria-modal="true"
          aria-label="NOVA assistant"
          onKeyDown={(event) => {
            // Basic focus trap: keep Tab/Shift+Tab cycling within the dialog
            // while it is open. Escape-to-close and initial focus are handled
            // by the effects above.
            if (event.key !== 'Tab') return;
            const focusable = dialog.current?.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable || focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && active === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && active === last) {
              event.preventDefault();
              first.focus();
            }
          }}
          className="panel-solid animate-cosmos-rise fixed bottom-20 right-3 z-40 flex h-[min(34rem,72vh)] w-[min(26rem,calc(100vw-1.5rem))] flex-col overflow-hidden sm:bottom-24 sm:right-6"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="hud-label">NOVA · Onboard AI</p>
              <p className="mt-0.5 text-[0.6875rem] text-slate-500">{copy.hint}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close NOVA"
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100"
            >
              <BsX className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex gap-1 border-b border-white/10 px-3 py-2" role="tablist">
            {(Object.keys(MODE_COPY) as ChatMode[]).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={`rounded-full px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] transition-colors ${
                  mode === value
                    ? 'bg-nova/15 text-nova'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                {MODE_COPY[value].label}
              </button>
            ))}
          </div>

          <div
            ref={log}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            <Bubble role="assistant">{GREETING[mode]}</Bubble>

            {messages.map((message, i) => (
              <Bubble key={i} role={message.role}>
                {message.content}
              </Bubble>
            ))}

            {pending && (
              <p className="font-mono text-xs text-nova/70">
                <span className="animate-cosmos-pulse">Computing trajectory…</span>
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-relay/10 px-3 py-2 text-xs text-relay">
                {error}
              </p>
            )}

            {messages.length === 0 && !pending && (
              <div className="space-y-1.5 pt-1">
                {starterPrompts[mode].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs leading-snug text-slate-300 transition-colors hover:border-nova/40 hover:text-nova"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
            className="border-t border-white/10 p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={input}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter sends; Shift+Enter inserts a newline, which matters
                  // for pasting a multi-line job description in fit mode.
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
                rows={mode === 'fit' ? 3 : 1}
                placeholder={copy.placeholder}
                aria-label={copy.placeholder}
                className="max-h-32 flex-1 resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-nova/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-nova/15 text-nova transition-colors hover:bg-nova/25 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <BsSend className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: ChatMessage['role']; children: React.ReactNode }) {
  const isUser = role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-nova/15 text-slate-100'
            : 'rounded-bl-sm bg-white/[0.04] text-slate-300'
        }`}
      >
        {children}
      </p>
    </div>
  );
}
