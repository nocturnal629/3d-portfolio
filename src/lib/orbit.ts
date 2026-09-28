import { Vector3 } from 'three';
import type { CelestialBody } from '@/types';

/** Writes a body's world position at `time` seconds into `out`.
 *
 *  The orbit is a circle of radius `orbitRadius` in the XZ plane, rotated
 *  about the X axis by `orbitTilt` so the planes don't all coincide. Both the
 *  rendered mesh and the camera rig call this with the same `state.clock`
 *  time, which is what keeps the camera locked onto a moving planet instead
 *  of drifting behind it. */
export function bodyPosition(body: CelestialBody, time: number, out: Vector3): Vector3 {
  if (body.orbitRadius === 0) return out.set(0, 0, 0);

  const angle = body.orbitPhase + time * body.orbitSpeed;
  const x = Math.cos(angle) * body.orbitRadius;
  const flat = Math.sin(angle) * body.orbitRadius;

  return out.set(x, -flat * Math.sin(body.orbitTilt), flat * Math.cos(body.orbitTilt));
}

export interface CameraStop {
  /** Camera position relative to the body, in the body's orbital frame. */
  offset: [number, number, number];
  /** Shifts the look-at point off the body, which slides the body across the
   *  screen. Negative X pushes the subject to the right of frame, clearing
   *  the left-aligned copy. */
  look: [number, number, number];
}

/** Hand-tuned rather than derived, so each stop gets its own composition: the
 *  hero pulls right back to frame the whole star beside the headline, and the
 *  outer bodies sit closer and off to one side so the content panel never
 *  lands squarely on top of its subject. */
const CAMERA_STOPS: CameraStop[] = [
  { offset: [0, 4, 34], look: [-9, 0.5, 0] }, // home — wide, star right of the headline
  { offset: [5.2, 2.4, 8.5], look: [2.5, 0, 0] }, // projects
  { offset: [-7.0, 3.0, 9.5], look: [-3.0, 0, 0] }, // experience
  { offset: [6.2, 2.0, 8.0], look: [2.5, 0, 0] }, // certifications
  { offset: [-6.8, 2.6, 9.8], look: [-3.2, 0, 0] }, // about
  { offset: [5.0, 1.8, 7.0], look: [2.0, 0, 0] }, // signal
];

export function cameraStop(index: number): CameraStop {
  return CAMERA_STOPS[Math.min(Math.max(index, 0), CAMERA_STOPS.length - 1)];
}

/** Ease used when blending between two waypoints, so arriving at a body
 *  settles instead of stopping dead. */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
