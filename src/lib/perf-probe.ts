'use client';

/** Temporary instrumentation for diagnosing scene framerate. Reachable only
 *  with `?perf=1` in the URL, so ordinary visitors never load or see it.
 *  Delete this file and its two components once the cause is found.
 *
 *  Deliberately a mutable object rather than React state: the overlay samples
 *  it every frame, and routing that through setState would re-render on every
 *  frame and change the thing being measured. */
export const perfStats = {
  fps: 0,
  minFps: Number.POSITIVE_INFINITY,
  draws: 0,
  tris: 0,
  programs: 0,
  dpr: 0,
  postFx: false,
  /** Wall time the synchronous shader compile blocked the main thread for. */
  compileMs: 0,
  /** Time from navigation start to the scene finishing that compile. */
  readyMs: 0,
};

export function perfEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('perf');
}

/** Transferred size and slowest single request across the JS chunks — which is
 *  where a lazily imported three/drei/postprocessing bundle shows up. */
export function scriptLoadSummary(): { kb: number; slowestMs: number } {
  if (typeof performance === 'undefined') return { kb: 0, slowestMs: 0 };

  let bytes = 0;
  let slowestMs = 0;

  for (const entry of performance.getEntriesByType('resource')) {
    const timing = entry as PerformanceResourceTiming;
    if (!timing.name.includes('/_next/static/chunks/')) continue;
    bytes += timing.encodedBodySize || timing.transferSize || 0;
    slowestMs = Math.max(slowestMs, timing.duration);
  }

  return { kb: Math.round(bytes / 1024), slowestMs: Math.round(slowestMs) };
}
