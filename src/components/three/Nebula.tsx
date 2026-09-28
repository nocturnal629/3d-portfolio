'use client';

import { useEffect, useMemo } from 'react';
import { AdditiveBlending } from 'three';
import { radialGradientTexture } from './textures';

/** Position, scale and colour of each gas cloud. Placed far behind the
 *  system so parallax makes them drift slowly as the camera travels
 *  outward. */
const CLOUDS = [
  { position: [-48, 14, -72] as const, scale: 90, color: '#3b1f6e', opacity: 0.34 },
  { position: [62, -20, -88] as const, scale: 115, color: '#0d4f6e', opacity: 0.3 },
  { position: [10, 38, -110] as const, scale: 140, color: '#5b1f52', opacity: 0.22 },
  { position: [-70, -32, -56] as const, scale: 70, color: '#1e3a8a', opacity: 0.26 },
];

export default function Nebula() {
  const textures = useMemo(
    () => CLOUDS.map((cloud) => radialGradientTexture(cloud.color, 0.5, 512)),
    [],
  );

  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);

  return (
    <group>
      {CLOUDS.map((cloud, i) => (
        <sprite key={i} position={cloud.position} scale={cloud.scale}>
          <spriteMaterial
            map={textures[i]}
            blending={AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            transparent
            opacity={cloud.opacity}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
