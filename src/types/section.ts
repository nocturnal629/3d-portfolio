import type { IconType } from 'react-icons';

export type SectionId = 'home' | 'projects' | 'experience' | 'certifications' | 'about' | 'signal';

/** Visual + orbital parameters for the celestial body that represents a section. */
export interface CelestialBody {
  /** Radius of the sphere, in world units. */
  radius: number;
  /** Distance from the central star. `0` for the star itself. */
  orbitRadius: number;
  /** Radians per second travelled along the orbit. */
  orbitSpeed: number;
  /** Starting angle on the orbit, in radians — keeps planets from lining up. */
  orbitPhase: number;
  /** Inclination of the orbital plane, in radians. */
  orbitTilt: number;
  /** Radians per second the body spins about its own axis. */
  spinSpeed: number;
  /** Base surface colour. */
  color: string;
  /** Rim/atmosphere glow colour. */
  glow: string;
  /** Saturn-style ring, if this body has one. */
  ring?: { inner: number; outer: number; color: string; tilt: number };
  /** Small satellites orbiting the body. */
  moons?: { radius: number; distance: number; speed: number; color: string }[];
}

export interface Section {
  id: SectionId;
  /** Short label used in the HUD navigation. */
  label: string;
  /** In-fiction name of the celestial body. */
  bodyName: string;
  /** One-line flavour text shown in the HUD readout. */
  tagline: string;
  icon: IconType;
  body: CelestialBody;
}
