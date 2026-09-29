'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { perfEnabled, perfStats, scriptLoadSummary } from '@/lib/perf-probe';

/** The query string cannot change without a navigation, so there is nothing
 *  to subscribe to — this exists only to read the flag without tripping the
 *  setState-in-effect rule the rest of the app avoids the same way. */
const noSubscribe = () => () => {};
const disabledOnServer = () => false;

/** Reads the numbers out of lib/perf-probe and paints them. Temporary.
 *
 *  Writes through a ref rather than state so the readout itself does not
 *  re-render the tree sixty times a second while measuring it. */
export default function PerfOverlay() {
  // Server snapshot is false so SSR and the first client pass agree on
  // rendering nothing.
  const enabled = useSyncExternalStore(noSubscribe, perfEnabled, disabledOnServer);
  const box = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    let ticks = 0;
    let scripts = scriptLoadSummary();

    const paint = () => {
      // Walking every resource entry each frame would itself cost something;
      // chunk totals only change while things are still downloading.
      if (ticks % 60 === 0) scripts = scriptLoadSummary();
      ticks += 1;

      const element = box.current;
      if (element) {
        const min = Number.isFinite(perfStats.minFps) ? perfStats.minFps : 0;
        element.textContent = [
          `fps       ${perfStats.fps}   (min ${min})`,
          `draws     ${perfStats.draws}`,
          `tris      ${(perfStats.tris / 1000).toFixed(1)}k`,
          `programs  ${perfStats.programs}`,
          `dpr       ${perfStats.dpr.toFixed(2)}`,
          `postFX    ${perfStats.postFx ? 'on' : 'off'}`,
          `compile   ${perfStats.compileMs}ms`,
          `scene at  ${perfStats.readyMs}ms`,
          `chunks    ${scripts.kb}KB`,
          `slowest   ${scripts.slowestMs}ms`,
        ].join('\n');
      }

      frame = requestAnimationFrame(paint);
    };

    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <pre
      ref={box}
      aria-hidden="true"
      className="panel-solid pointer-events-none fixed bottom-4 left-4 z-50 rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed text-nova"
    />
  );
}
