'use client';

import { useEffect, useRef, useState } from 'react';
import { BsX, BsTrophy } from 'react-icons/bs';
import { useGame } from '@/lib/game';
import type { LeaderboardEntry } from '@/app/api/leaderboard/route';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: LeaderboardEntry[] };

export default function Leaderboard({ onClose }: { onClose: () => void }) {
  const highScore = useGame((s) => s.highScore);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Fetch once on open. The panel is short-lived, so no polling — a re-open
  // re-fetches, and the route caches briefly server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/leaderboard', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { entries?: LeaderboardEntry[] };
        if (!cancelled) {
          setState({ status: 'ready', entries: Array.isArray(data.entries) ? data.entries : [] });
        }
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Highlight the device's own best run: the first row whose score matches the
  // local highScore (and only if the player has actually recorded one).
  const myIndex =
    state.status === 'ready' && highScore > 0
      ? state.entries.findIndex((entry) => entry.score === highScore)
      : -1;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Leaderboard — top scores"
        tabIndex={-1}
        className="panel-solid animate-cosmos-rise relative flex max-h-[90vh] w-[min(520px,92vw)] flex-col overflow-hidden rounded-2xl focus:outline-none"
      >
        <header className="flex items-center gap-4 border-b border-white/10 px-4 py-2.5">
          <p className="hud-label shrink-0 inline-flex items-center gap-2">
            <BsTrophy className="h-3.5 w-3.5" aria-hidden="true" />
            Leaderboard
          </p>
          <p className="flex-1 text-right font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-slate-400">
            Top {20}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="panel-hover inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:text-nova"
          >
            <BsX className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4">
          {state.status === 'loading' && (
            <p className="py-8 text-center font-mono text-xs uppercase tracking-[0.16em] text-slate-500">
              Reading relay logs…
            </p>
          )}

          {state.status === 'error' && (
            <p className="py-8 text-center text-sm text-slate-400">
              Could not reach the leaderboard right now. Try again in a moment.
            </p>
          )}

          {state.status === 'ready' && state.entries.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No scores logged yet. Be the first to transmit one.
            </p>
          )}

          {state.status === 'ready' && state.entries.length > 0 && (
            <ol className="flex flex-col gap-1.5">
              {state.entries.map((entry, index) => {
                const isMine = index === myIndex;
                return (
                  <li
                    key={`${entry.createdAt}-${index}`}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      isMine ? 'border-nova/50 bg-white/5' : 'border-white/10'
                    }`}
                  >
                    <span className="w-7 shrink-0 text-center font-mono text-xs text-slate-500">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs uppercase tracking-[0.12em] text-slate-200">
                      {entry.name}
                      {isMine && <span className="ml-2 text-[0.625rem] text-nova">you</span>}
                    </span>
                    <span className="shrink-0 font-mono text-sm text-solar">{entry.score}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
