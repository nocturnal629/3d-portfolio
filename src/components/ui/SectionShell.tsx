import type { ReactNode } from 'react';
import { sectionById } from '@/data/sections';
import { sectionIcons } from '@/data/section-icons';
import type { SectionId } from '@/types';

interface SectionShellProps {
  id: Exclude<SectionId, 'home'>;
  /** Overrides the heading text; defaults to the section's HUD label. */
  title?: string;
  children: ReactNode;
  /** Wider layout for the grid-heavy sections. */
  width?: 'prose' | 'wide';
}

/** Every content section shares this frame: a full-viewport scroll stop with
 *  a single frosted panel floating over the 3D scene. The `id` doubles as the
 *  scroll anchor that ScrollDriver measures and that `flyTo` targets, so it
 *  must match the section id in `src/data/sections.ts`. */
export default function SectionShell({ id, title, children, width = 'wide' }: SectionShellProps) {
  const section = sectionById[id];
  const Icon = sectionIcons[id];

  return (
    <section
      id={id}
      className="relative flex min-h-screen items-center px-4 py-24 sm:px-6 lg:px-8 lg:pl-32"
    >
      <div className={`mx-auto w-full ${width === 'prose' ? 'max-w-3xl' : 'max-w-5xl'}`}>
        <div className="panel p-6 sm:p-8">
          <header className="mb-8">
            <p className="hud-label flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {section.bodyName}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
              {title ?? section.label}
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">{section.tagline}</p>
          </header>

          {children}
        </div>
      </div>
    </section>
  );
}
