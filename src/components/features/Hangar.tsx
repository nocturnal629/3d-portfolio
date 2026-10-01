'use client';

import { useEffect, useRef, useState } from 'react';
import { BsLock, BsCheckCircleFill, BsX } from 'react-icons/bs';
import { useGame } from '@/lib/game';
import { COSMETICS, drawShip, type Cosmetic } from '@/lib/cosmetics';

/** Static, one-shot preview of a ship. Draws once per render (and on cosmetic
 *  change) — no animation loop, so it is safe under reduced-motion/low-power. */
function ShipPreview({ cosmetic, dimmed }: { cosmetic: Cosmetic; dimmed: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Backing store at a fixed, crisp size; CSS scales it down.
    const size = 72;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    const w = 44;
    const h = 30;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.globalAlpha = dimmed ? 0.35 : 1;
    drawShip(ctx, cosmetic.shape, x, y, w, h, dimmed ? '#64748b' : cosmetic.color);
    ctx.globalAlpha = 1;
  }, [cosmetic, dimmed]);

  return <canvas ref={ref} aria-hidden="true" className="h-[52px] w-[52px]" />;
}

export default function Hangar({ onClose }: { onClose: () => void }) {
  const unlockedCosmetics = useGame((s) => s.unlockedCosmetics);
  const selectedCosmetic = useGame((s) => s.selectedCosmetic);
  const redeemCode = useGame((s) => s.redeemCode);
  const selectCosmetic = useGame((s) => s.selectCosmetic);

  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'miss'; text: string } | null>(null);
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

  const submitCode = (event: React.FormEvent) => {
    event.preventDefault();
    const match = redeemCode(code);
    if (match) {
      setFeedback({ kind: 'ok', text: `Access granted — ${match.name} unlocked.` });
      setCode('');
    } else {
      // Wrong codes fail quietly: a gentle note, no lockout, no penalty.
      setFeedback({ kind: 'miss', text: 'Code not recognised. Keep looking.' });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Hangar — ship cosmetics"
        tabIndex={-1}
        className="panel-solid animate-cosmos-rise relative flex max-h-[90vh] w-[min(560px,92vw)] flex-col overflow-hidden rounded-2xl focus:outline-none"
      >
        <header className="flex items-center gap-4 border-b border-white/10 px-4 py-2.5">
          <p className="hud-label shrink-0">Hangar</p>
          <p className="flex-1 text-right font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-slate-400">
            Hull Select
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hangar"
            className="panel-hover inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:text-nova"
          >
            <BsX className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COSMETICS.map((cosmetic) => {
              const unlocked = unlockedCosmetics.includes(cosmetic.id);
              const selected = selectedCosmetic === cosmetic.id;
              return (
                <li key={cosmetic.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => selectCosmetic(cosmetic.id)}
                    aria-pressed={selected}
                    title={unlocked ? cosmetic.blurb : 'Locked — find the unlock code'}
                    className={`panel-hover relative flex w-full flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center ${
                      selected
                        ? 'border-nova/60 bg-white/5'
                        : 'border-white/10'
                    } ${unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                  >
                    {selected && (
                      <BsCheckCircleFill
                        className="absolute right-2 top-2 h-3.5 w-3.5 text-nova"
                        aria-hidden="true"
                      />
                    )}
                    <ShipPreview cosmetic={cosmetic} dimmed={!unlocked} />
                    <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-slate-200">
                      {cosmetic.name}
                    </span>
                    {unlocked ? (
                      <span className="text-[0.625rem] leading-tight text-slate-500">
                        {selected ? 'Equipped' : 'Tap to equip'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.625rem] uppercase tracking-[0.12em] text-slate-500">
                        <BsLock className="h-3 w-3" aria-hidden="true" />
                        Locked
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <form onSubmit={submitCode} className="mt-5 border-t border-white/10 pt-4">
            <label htmlFor="hangar-code" className="hud-label mb-2 block">
              Enter unlock code
            </label>
            <div className="flex gap-2">
              <input
                id="hangar-code"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. a transmission you intercepted"
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-200 placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-600 focus:border-nova/50 focus:outline-none"
              />
              <button
                type="submit"
                className="panel-hover shrink-0 rounded-full border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-slate-200 hover:text-nova"
              >
                Redeem
              </button>
            </div>
            <p
              aria-live="polite"
              className={`mt-2 min-h-[1.1rem] text-xs ${
                feedback?.kind === 'ok' ? 'text-nova' : 'text-slate-500'
              }`}
            >
              {feedback?.text ?? 'Codes are hidden around this site. Decode, view-source, or just ask NOVA.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
