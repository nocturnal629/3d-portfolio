'use client';

export const LOW_POWER_STORAGE_KEY = 'cosmos:low-power';

export type SceneQuality = 'high' | 'low';

export interface DeviceProfile {
  /** `low` drops post-processing and most of the starfield. */
  quality: SceneQuality;
  /** `true` replaces the WebGL scene entirely with the static backdrop. */
  lowPower: boolean;
}

/** Rendered during SSR and hydration. Deliberately the conservative option:
 *  the server has no way to know the device or the visitor's motion
 *  preference, and starting from "scene off" means the canvas only ever
 *  fades in, never flashes out. */
const SERVER_PROFILE: DeviceProfile = { quality: 'low', lowPower: true };

const listeners = new Set<() => void>();

/** `useSyncExternalStore` compares snapshots by identity, so this must be a
 *  stable object that is only replaced when something actually changes —
 *  recomputing it per call would loop forever. */
let snapshot: DeviceProfile | null = null;

function detectQuality(): SceneQuality {
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  // Phones and low-core machines get the cheap scene; everything else gets
  // bloom and the full starfield.
  return cores <= 4 || (coarse && window.innerWidth < 900) ? 'low' : 'high';
}

function detectLowPower(): boolean {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(LOW_POWER_STORAGE_KEY);
  } catch {
    // Private mode and blocked storage both throw here; fall through to the
    // OS preference rather than failing to render a backdrop at all.
  }

  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function compute(): DeviceProfile {
  return { quality: detectQuality(), lowPower: detectLowPower() };
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Single shared media-query listener for the whole module. Every subscriber
 *  used to register its own `matchMedia` listener, so a preference change ran
 *  `compute()`/`emit()` once per subscriber; attaching one listener lazily on
 *  the first subscription — and tearing it down when the last leaves — does
 *  that work exactly once. */
let motionQuery: MediaQueryList | null = null;
const onMotionChange = () => {
  snapshot = compute();
  emit();
};

export function subscribeDevice(listener: () => void): () => void {
  if (listeners.size === 0) {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', onMotionChange);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && motionQuery) {
      motionQuery.removeEventListener('change', onMotionChange);
      motionQuery = null;
    }
  };
}

export function getDeviceSnapshot(): DeviceProfile {
  if (!snapshot) snapshot = compute();
  return snapshot;
}

export function getServerDeviceSnapshot(): DeviceProfile {
  return SERVER_PROFILE;
}

/** Records an explicit choice, which from then on outranks the OS-level
 *  motion preference on this device. */
export function setLowPowerPreference(lowPower: boolean) {
  try {
    window.localStorage.setItem(LOW_POWER_STORAGE_KEY, String(lowPower));
  } catch {
    // Not persisting is acceptable; the in-memory snapshot below still
    // applies for this page view.
  }

  snapshot = { ...getDeviceSnapshot(), lowPower };
  emit();
}
