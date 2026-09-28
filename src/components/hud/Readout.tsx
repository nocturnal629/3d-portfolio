'use client';

import { sectionById } from '@/data/sections';
import { useCosmos } from '@/lib/store';

/** Top-left instrument readout naming the body currently in frame. */
export default function Readout() {
  const activeId = useCosmos((state) => state.activeId);
  const section = sectionById[activeId];

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-30 max-w-[min(20rem,70vw)] sm:left-6 sm:top-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-cosmos-pulse rounded-full bg-nova" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-nova/80" />
        </span>
        <span className="hud-label">Now orbiting</span>
      </div>

      {/* key= restarts the rise animation on every change, so the readout
          visibly re-prints instead of silently swapping text. */}
      <p key={section.id} className="animate-cosmos-rise mt-1 font-mono text-sm text-slate-100">
        {section.bodyName}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-slate-400">{section.tagline}</p>
    </div>
  );
}
