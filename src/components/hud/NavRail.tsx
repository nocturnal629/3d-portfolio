'use client';

import { sections } from '@/data/sections';
import { flyTo } from '@/lib/scroll';
import { useCosmos } from '@/lib/store';

/** Vertical waypoint list pinned to the left edge on desktop. Each entry is a
 *  body in the system; the active one expands to show its in-fiction name. */
export default function NavRail() {
  const activeId = useCosmos((state) => state.activeId);

  return (
    <nav
      aria-label="Sections"
      className="pointer-events-none fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 pl-5 lg:block"
    >
      <ul className="flex flex-col gap-1">
        {sections.map((section) => {
          const active = section.id === activeId;

          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => flyTo(section.id)}
                aria-current={active ? 'true' : undefined}
                className="pointer-events-auto group flex items-center gap-3 rounded-full py-1.5 pr-3 text-left"
              >
                <span
                  className={`h-px transition-all duration-300 ${
                    active ? 'w-8 bg-nova' : 'w-4 bg-white/25 group-hover:w-6 group-hover:bg-white/50'
                  }`}
                />
                <span
                  className={`font-mono text-[0.6875rem] uppercase tracking-[0.18em] transition-colors duration-300 ${
                    active ? 'text-nova' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  {section.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
