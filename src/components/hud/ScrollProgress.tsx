'use client';

import { useEffect, useRef } from 'react';
import { sections } from '@/data/sections';
import { useCosmos } from '@/lib/store';

/** Thin trajectory bar across the top of the viewport.
 *
 *  Driven by a store subscription that writes straight to the DOM instead of
 *  setState — this updates on every scroll frame, and re-rendering React that
 *  often would compete with the render loop for the main thread. */
export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const span = Math.max(1, sections.length - 1);

    const apply = (progress: number) => {
      if (bar.current) bar.current.style.transform = `scaleX(${progress / span})`;
    };

    apply(useCosmos.getState().progress);
    return useCosmos.subscribe((state) => apply(state.progress));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-px bg-white/5">
      <div
        ref={bar}
        className="h-full origin-left bg-gradient-to-r from-nova via-plasma to-relay"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
