'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, Group, Mesh, Vector3 } from 'three';
import Atmosphere from './Atmosphere';
import OrbitPath from './OrbitPath';
import { bodyPosition } from '@/lib/orbit';
import { getProgress } from '@/lib/store';
import type { CelestialBody } from '@/types';

interface PlanetProps {
  body: CelestialBody;
  /** This body's index in `sections`, used to tell how close the camera is. */
  index: number;
}

const scratch = new Vector3();

export default function Planet({ body, index }: PlanetProps) {
  const group = useRef<Group>(null);
  const surface = useRef<Mesh>(null);
  const moons = useRef<Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (group.current) {
      group.current.position.copy(bodyPosition(body, t, scratch));

      // Bodies swell slightly as the camera settles on them, which gives the
      // scroll a sense of arrival that camera distance alone doesn't.
      const focus = 1 - Math.min(1, Math.abs(getProgress() - index));
      const target = 1 + focus * 0.12;
      group.current.scale.lerp(scratch.set(target, target, target), Math.min(1, delta * 3));
    }

    if (surface.current) surface.current.rotation.y = t * body.spinSpeed;
    if (moons.current) moons.current.rotation.y = t * 0.35;
  });

  return (
    <>
      <OrbitPath radius={body.orbitRadius} tilt={body.orbitTilt} color={body.glow} />

      <group ref={group}>
        <mesh ref={surface}>
          <sphereGeometry args={[body.radius, 64, 64]} />
          <meshStandardMaterial
            color={body.color}
            roughness={0.72}
            metalness={0.12}
            emissive={body.glow}
            // Just enough self-illumination that the night side reads as a
            // planet rather than a hole in the starfield.
            emissiveIntensity={0.22}
          />
        </mesh>

        <Atmosphere radius={body.radius} color={body.glow} />

        {body.ring && (
          <mesh rotation={[Math.PI / 2 + body.ring.tilt, 0, 0]}>
            <ringGeometry args={[body.ring.inner, body.ring.outer, 128]} />
            <meshBasicMaterial
              color={body.ring.color}
              transparent
              opacity={0.42}
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}

        {body.moons && (
          <group ref={moons}>
            {body.moons.map((moon, i) => (
              <Moon key={i} {...moon} />
            ))}
          </group>
        )}
      </group>
    </>
  );
}

interface MoonProps {
  radius: number;
  distance: number;
  speed: number;
  color: string;
}

function Moon({ radius, distance, speed, color }: MoonProps) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const angle = state.clock.elapsedTime * speed;
    ref.current.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle * 0.6) * distance * 0.22,
      Math.sin(angle) * distance,
    );
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial color={color} roughness={0.9} emissive={color} emissiveIntensity={0.15} />
    </mesh>
  );
}
