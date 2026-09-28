'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { sections } from '@/data/sections';
import { bodyPosition, cameraStop, clamp, smoothstep } from '@/lib/orbit';
import { getProgress } from '@/lib/store';

const target = new Vector3();
const desiredPosition = new Vector3();
const desiredLookAt = new Vector3();
const waypointA = new Vector3();
const waypointB = new Vector3();
const lookA = new Vector3();
const lookB = new Vector3();

/** Resolves the camera position and look-at point for one whole waypoint. */
function waypoint(index: number, time: number, outPosition: Vector3, outLookAt: Vector3) {
  const section = sections[clamp(index, 0, sections.length - 1)];
  bodyPosition(section.body, time, outLookAt);

  const { offset, look } = cameraStop(index);

  // Both vectors are applied in the body's own orbital frame rather than in
  // world space, so the camera stays on the same side of a planet as it
  // swings around the star instead of ending up behind it half an orbit
  // later — and the subject holds the same spot on screen throughout.
  const angle = section.body.orbitRadius === 0 ? 0 : Math.atan2(outLookAt.z, outLookAt.x);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  outLookAt.set(
    outLookAt.x + look[0] * cos - look[2] * sin,
    outLookAt.y + look[1],
    outLookAt.z + look[0] * sin + look[2] * cos,
  );

  outPosition.set(
    outLookAt.x + offset[0] * cos - offset[2] * sin,
    outLookAt.y + offset[1],
    outLookAt.z + offset[0] * sin + offset[2] * cos,
  );
}

interface CameraRigProps {
  /** Normalised pointer position, used for a small parallax lean. */
  pointer: React.RefObject<{ x: number; y: number }>;
}

export default function CameraRig({ pointer }: CameraRigProps) {
  const initialised = useRef(false);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const progress = getProgress();

    const lower = Math.floor(progress);
    const upper = Math.min(sections.length - 1, lower + 1);
    const blend = smoothstep(progress - lower);

    waypoint(lower, time, waypointA, lookA);
    waypoint(upper, time, waypointB, lookB);

    desiredPosition.copy(waypointA).lerp(waypointB, blend);
    desiredLookAt.copy(lookA).lerp(lookB, blend);

    // Parallax lean: shifts the camera a little with the pointer without
    // changing what it is looking at, which reads as head movement.
    const lean = pointer.current;
    if (lean) {
      desiredPosition.x += lean.x * 1.6;
      desiredPosition.y += lean.y * 1.1;
    }

    // Frame-rate independent smoothing. The first frame snaps, so the scene
    // doesn't open with a swoop in from the origin on a deep link.
    const alpha = initialised.current ? 1 - Math.pow(0.0015, delta) : 1;
    initialised.current = true;

    state.camera.position.lerp(desiredPosition, alpha);
    target.lerp(desiredLookAt, alpha);
    state.camera.lookAt(target);
  });

  return null;
}
