'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, type Mesh, type Sprite } from 'three';
import { radialGradientTexture } from './textures';
import type { CelestialBody } from '@/types';

interface StarProps {
  body: CelestialBody;
}

/** The central star. Rendered unlit (the bloom pass is what makes it glow)
 *  with two additive halo sprites for the corona, and a point light that
 *  actually lights the planets. */
export default function Star({ body }: StarProps) {
  const core = useRef<Mesh>(null);
  const innerHalo = useRef<Sprite>(null);
  const outerHalo = useRef<Sprite>(null);

  const coreTexture = useMemo(() => radialGradientTexture(body.color, 0.3), [body.color]);
  const glowTexture = useMemo(() => radialGradientTexture(body.glow, 0.15), [body.glow]);

  useEffect(() => () => {
    coreTexture.dispose();
    glowTexture.dispose();
  }, [coreTexture, glowTexture]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (core.current) core.current.rotation.y = t * body.spinSpeed;

    // Slow, irregular breathing so the star never looks like a static decal.
    const pulse = 1 + Math.sin(t * 0.6) * 0.02 + Math.sin(t * 1.37) * 0.012;
    if (innerHalo.current) innerHalo.current.scale.setScalar(body.radius * 6.2 * pulse);
    if (outerHalo.current) outerHalo.current.scale.setScalar(body.radius * 11 * (2 - pulse));
  });

  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[body.radius, 48, 48]} />
        <meshBasicMaterial color={body.color} toneMapped={false} />
      </mesh>

      <sprite ref={innerHalo} scale={body.radius * 6.2}>
        <spriteMaterial
          map={coreTexture}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={outerHalo} scale={body.radius * 11}>
        <spriteMaterial
          map={glowTexture}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.35}
          toneMapped={false}
        />
      </sprite>

      {/* decay={0} keeps the outermost bodies lit without cranking intensity
          into a blown-out core on the inner ones. */}
      <pointLight color={body.glow} intensity={2.4} distance={0} decay={0} />
      <pointLight color="#ffffff" intensity={1.1} distance={120} decay={1.4} />
    </group>
  );
}
