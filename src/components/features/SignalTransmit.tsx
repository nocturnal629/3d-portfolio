'use client';

import { useState } from 'react';
import { BsBroadcast } from 'react-icons/bs';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const MAX_NAME = 60;
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 2000;

/** "Transmit a signal" — the idea-submission form, posting to /api/ideas.
 *
 *  Field names match the API contract exactly (`name`, `title`, `description`,
 *  plus the `company` honeypot); only the presentation is space-themed. */
export default function SignalTransmit() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus('sending');
    setError(null);

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          title: String(data.get('title') ?? ''),
          description: String(data.get('description') ?? ''),
          company: String(data.get('company') ?? ''),
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok) {
        setError(payload.error || 'The transmission failed. Try again in a moment.');
        setStatus('error');
        return;
      }

      form.reset();
      setStatus('sent');
    } catch {
      setError('Could not reach the relay. Check your connection and try again.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="panel flex flex-col items-center gap-3 p-8 text-center">
        <BsBroadcast className="h-7 w-7 text-nova" aria-hidden="true" />
        <p className="text-sm text-slate-200">Signal received.</p>
        <p className="max-w-sm text-xs leading-relaxed text-slate-400">
          It is logged at the relay. Thanks for sending it over.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-nova hover:text-nova/80"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot: positioned off-screen rather than display:none, because
          some bots skip hidden inputs. Real users never reach it — it is
          out of the tab order and hidden from assistive tech. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field label="Your name" hint="Optional">
        <input
          name="name"
          type="text"
          maxLength={MAX_NAME}
          autoComplete="name"
          placeholder="Anonymous"
          className={inputClass}
        />
      </Field>

      <Field label="Idea" hint="Required">
        <input
          name="title"
          type="text"
          required
          maxLength={MAX_TITLE}
          placeholder="One line — what should exist?"
          className={inputClass}
        />
      </Field>

      <Field label="Details" hint="Required">
        <textarea
          name="description"
          required
          rows={4}
          maxLength={MAX_DESCRIPTION}
          placeholder="What problem does it solve, and who for?"
          className={`${inputClass} resize-y`}
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg bg-relay/10 px-3 py-2 text-xs text-relay">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex items-center gap-2 rounded-full border border-nova/30 bg-nova/10 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-nova transition-colors hover:bg-nova/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <BsBroadcast className="h-4 w-4" aria-hidden="true" />
        {status === 'sending' ? 'Transmitting…' : 'Transmit'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-nova/50 focus:outline-none';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="hud-label">{label}</span>
        <span className="font-mono text-[0.625rem] text-slate-600">{hint}</span>
      </span>
      {children}
    </label>
  );
}
