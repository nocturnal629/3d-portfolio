'use client';

import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { perfStats } from '@/lib/perf-probe';

/** Samples renderer counters and times shader compilation. Temporary — see
 *  lib/perf-probe.ts.
 *
 *  Mounted immediately before drei's `<Preload all />` so this compile is the
 *  one that does the real work and Preload's is a cache hit. That way the
 *  number describes the configuration that actually ships, rather than one
 *  altered to make it measurable. */
export default function PerfProbe({ postFx }: { postFx: boolean }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const sample = useRef({ frames: 0, since: 0 });

  useLayoutEffect(() => {
    const started = performance.now();
    gl.compile(scene, camera);
    perfStats.compileMs = Math.round(performance.now() - started);
    perfStats.readyMs = Math.round(performance.now());
  }, [gl, scene, camera]);

  useFrame(() => {
    perfStats.postFx = postFx;
    perfStats.dpr = gl.getPixelRatio();
    perfStats.draws = gl.info.render.calls;
    perfStats.tris = gl.info.render.triangles;
    perfStats.programs = gl.info.programs?.length ?? 0;

    const now = performance.now();
    const window_ = sample.current;

    if (window_.since === 0) window_.since = now;
    window_.frames += 1;

    const elapsed = now - window_.since;
    if (elapsed >= 500) {
      perfStats.fps = Math.round((window_.frames * 1000) / elapsed);
      // Tracked separately because the average hides exactly the stutter we
      // are chasing — a scroll that drops to 8fps for a second reads as fine.
      if (perfStats.fps < perfStats.minFps) perfStats.minFps = perfStats.fps;
      window_.frames = 0;
      window_.since = now;
    }
  });

  return null;
}
