'use client';

import { useMemo } from 'react';
import { AdditiveBlending, DoubleSide } from 'three';

interface OrbitPathProps {
  radius: number;
  tilt: number;
  color: string;
}

/** The faint ellipse a planet travels along. Drawn as a very thin ring rather
 *  than a line so it keeps a consistent width at any distance — `linewidth`
 *  is ignored by WebGL on most platforms. */
export default function OrbitPath({ radius, tilt, color }: OrbitPathProps) {
  const args = useMemo(() => [radius - 0.035, radius + 0.035, 96] as const, [radius]);

  return (
    <mesh rotation={[-Math.PI / 2 + tilt, 0, 0]}>
      <ringGeometry args={[args[0], args[1], args[2]]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.13}
        side={DoubleSide}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
