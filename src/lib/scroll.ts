'use client';

import type { SectionId } from '@/types';

/** Scrolls a section into view. Scroll is the single source of truth for the
 *  camera (see ScrollDriver), so HUD clicks and NOVA's navigation both go
 *  through here rather than moving the camera directly — that way the page
 *  and the scene can never disagree about where the visitor is. */
export function flyTo(id: SectionId) {
  const element = document.getElementById(id);
  if (!element) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
