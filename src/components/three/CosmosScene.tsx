'use client';

import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
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

export default function CosmosScene({ quality }: CosmosSceneProps) {
  const pointer = useRef({ x: 0, y: 0 });
  const setSceneReady = useCosmos((state) => state.setSceneReady);

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
      // bloom pass alone costs more than the rest of the frame.
      dpr={quality === 'high' ? [1, 1.75] : [1, 1]}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
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

      {quality === 'high' && (
        <EffectComposer>
          <Bloom
            intensity={1.15}
            // Only the star, atmospheres and additive rings clear this, so
            // planet surfaces stay crisp instead of washing out.
            luminanceThreshold={0.28}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
          <Vignette offset={0.28} darkness={0.62} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
