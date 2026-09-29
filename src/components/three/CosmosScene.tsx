'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import CameraRig from './CameraRig';
import Nebula from './Nebula';
import Planet from './Planet';
import Star from './Star';
import { sections } from '@/data/sections';
import { useCosmos } from '@/lib/store';

interface CosmosSceneProps {
  /** Scales down star count and disables post-processing on weaker devices. */
  quality: 'high' | 'low';
}

/** Upper bound on the resolution the scene is ever rendered at. The scene is
 *  fill-rate bound, not geometry bound, so every 0.25 here costs real frames. */
const MAX_DPR = { high: 1.5, low: 1 } as const;

/** Rescales the render resolution to whatever the GPU actually sustains, and
 *  reports when lowering it further has stopped helping.
 *
 *  Device class is guessed from CPU core count (see lib/device.ts), which says
 *  nothing about the GPU — an 8-core desktop with weak or software-rendered
 *  graphics reports as `high` and then struggles with the bloom pass.
 *  Measuring real frame times is the only heuristic that holds across both. */
function AdaptiveResolution({ max, onExhausted }: { max: number; onExhausted: () => void }) {
  const setDpr = useThree((state) => state.setDpr);

  return (
    <PerformanceMonitor
      // factor is 0 when frame times are bad and 1 when there is headroom.
      onChange={({ factor }) => {
        setDpr(1 + factor * (max - 1));
        // Already down to 1x and still not keeping up: what is left to cut is
        // the post-processing stack, not the pixel count.
        if (factor === 0) onExhausted();
      }}
      onFallback={onExhausted}
    />
  );
}

export default function CosmosScene({ quality }: CosmosSceneProps) {
  const pointer = useRef({ x: 0, y: 0 });
  const setSceneReady = useCosmos((state) => state.setSceneReady);

  // Post-processing is the single most expensive thing in the scene, and it is
  // the only real difference between this path and the `low` one that phones
  // get — which run the scene smoothly. So it is what gets dropped when the
  // resolution climbdown is not enough to hold a framerate.
  const [postFx, setPostFx] = useState(quality === 'high');

  // Deliberately one-way. Re-enabling on recovery would oscillate, because
  // the recovery is caused by the thing being off.
  const dropPostFx = useCallback(() => setPostFx(false), []);

  useEffect(() => {
    // Tracked on the window rather than through r3f's pointer events because
    // the canvas is `pointer-events: none` — the DOM content above it needs
    // every click and scroll.
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => () => setSceneReady(false), [setSceneReady]);

  const [star, ...planets] = sections;

  return (
    <Canvas
      // Capped rather than uncapped: at native DPR on a 3x phone screen the
      // bloom pass alone costs more than the rest of the frame. AdaptiveResolution
      // moves the live value around inside this range.
      dpr={[1, MAX_DPR[quality]]}
      // Never MSAA the default framebuffer. At high quality the composer owns
      // antialiasing on its own render target, so this would be a second,
      // discarded multisample resolve; at low quality it is not worth the
      // bandwidth on the devices that get there.
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 4, 24], fov: 52, near: 0.1, far: 500 }}
      onCreated={() => setSceneReady(true)}
    >
      <color attach="background" args={['#04060f']} />
      <fog attach="fog" args={['#04060f', 60, 220]} />

      <ambientLight intensity={0.18} />

      <Stars
        radius={180}
        depth={70}
        count={quality === 'high' ? 6500 : 2200}
        factor={4.2}
        saturation={0}
        fade
        speed={0.4}
      />
      <Nebula />

      <Star body={star.body} />
      {planets.map((section, i) => (
        <Planet key={section.id} body={section.body} index={i + 1} />
      ))}

      <CameraRig pointer={pointer} />

      {postFx && (
        // multisampling defaults to 8 in this library, which on a fill-rate
        // bound scene is the single most expensive setting in the whole app.
        // 2 keeps edges acceptable at a quarter of the sample cost.
        <EffectComposer multisampling={2}>
          <Bloom
            intensity={1.15}
            // Only the star, atmospheres and additive rings clear this, so
            // planet surfaces stay crisp instead of washing out.
            luminanceThreshold={0.28}
            luminanceSmoothing={0.35}
            mipmapBlur
            // The pass output is a wide blur, so halving its resolution is
            // free visually and quarters the fragments it touches.
            resolutionScale={0.5}
          />
          <Vignette offset={0.28} darkness={0.62} />
        </EffectComposer>
      )}

      {quality === 'high' && (
        <AdaptiveResolution max={MAX_DPR.high} onExhausted={dropPostFx} />
      )}
    </Canvas>
  );
}
