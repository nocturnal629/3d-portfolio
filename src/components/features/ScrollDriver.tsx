'use client';

import { useEffect } from 'react';
import { sections } from '@/data/sections';
import { useCosmos } from '@/lib/store';

/** Translates page scroll into the fractional section index the camera rig
 *  flies along. Runs as an effect-only component with no markup.
 *
 *  Anchors are measured from the DOM rather than assumed to be one viewport
 *  each, because the Projects and Experience panels are taller than the
 *  viewport on most screens. */
export default function ScrollDriver() {
  const setProgress = useCosmos((state) => state.setProgress);

  useEffect(() => {
    let anchors: number[] = [];
    let frame = 0;

    const measure = () => {
      const viewport = window.innerHeight;
      anchors = sections.map((section) => {
        const element = document.getElementById(section.id);
        if (!element) return 0;
        const top = element.getBoundingClientRect().top + window.scrollY;
        // Anchor on the centre of the section's first viewport, so a tall
        // section is "arrived at" when its top fills the screen rather than
        // when the reader reaches its middle.
        return top + Math.min(element.offsetHeight, viewport) / 2;
      });
    };

    const update = () => {
      frame = 0;
      if (anchors.length === 0) return;

      const probe = window.scrollY + window.innerHeight / 2;

      if (probe <= anchors[0]) return setProgress(0);
      if (probe >= anchors[anchors.length - 1]) return setProgress(anchors.length - 1);

      for (let i = 0; i < anchors.length - 1; i++) {
        const start = anchors[i];
        const end = anchors[i + 1];
        if (probe >= start && probe < end) {
          const span = end - start;
          return setProgress(i + (span > 0 ? (probe - start) / span : 0));
        }
      }
    };

    const onScroll = () => {
      // Coalesce to one update per frame; scroll fires far more often.
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Section heights change as fonts load and images decode; re-measuring on
    // mutation keeps the anchors honest without polling.
    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, [setProgress]);

  return null;
}
