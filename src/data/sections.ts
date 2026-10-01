import type { Section } from '@/types';

/** Order matters: this array defines both the HUD nav order and the order the
 *  camera flies through the system as the visitor scrolls. Index N in this
 *  array is scroll waypoint N. */
export const sections: Section[] = [
  {
    id: 'home',
    label: 'Home',
    bodyName: 'Sol \u2014 ALD-629',
    tagline: 'Primary star. Everything here orbits one developer.',
    body: {
      radius: 2.6,
      orbitRadius: 0,
      orbitSpeed: 0,
      orbitPhase: 0,
      orbitTilt: 0,
      spinSpeed: 0.05,
      color: '#ffb347',
      glow: '#ff7a18',
    },
  },
  {
    id: 'projects',
    label: 'Projects',
    bodyName: 'Kepler',
    tagline: 'Worlds already built and shipped.',
    body: {
      radius: 1.5,
      orbitRadius: 10,
      orbitSpeed: 0.075,
      orbitPhase: 0.4,
      orbitTilt: 0.12,
      spinSpeed: 0.28,
      color: '#3fb8e6',
      glow: '#7fe7ff',
      moons: [{ radius: 0.28, distance: 2.6, speed: 0.9, color: '#cfefff' }],
    },
  },
  {
    id: 'experience',
    label: 'Experience',
    bodyName: 'Chronos',
    tagline: 'A timeline in orbit \u2014 where the hours went.',
    body: {
      radius: 1.9,
      orbitRadius: 16,
      orbitSpeed: 0.05,
      orbitPhase: 2.3,
      orbitTilt: -0.17,
      spinSpeed: 0.2,
      color: '#b57edc',
      glow: '#e0b3ff',
      ring: { inner: 2.7, outer: 4.3, color: '#d8b4fe', tilt: 0.48 },
    },
  },
  {
    id: 'certifications',
    label: 'Certifications',
    bodyName: 'Vega Cluster',
    tagline: 'Fixed points \u2014 verified and independently confirmed.',
    body: {
      radius: 1.25,
      orbitRadius: 22,
      orbitSpeed: 0.038,
      orbitPhase: 4.1,
      orbitTilt: 0.26,
      spinSpeed: 0.34,
      color: '#5eead4',
      glow: '#a7fff0',
      moons: [
        { radius: 0.22, distance: 2.1, speed: 1.2, color: '#d9fff8' },
        { radius: 0.16, distance: 3.0, speed: -0.8, color: '#9decdd' },
      ],
    },
  },
  {
    id: 'about',
    label: 'About',
    bodyName: 'Terra Nova',
    tagline: 'The home world. Who is actually behind all this.',
    body: {
      radius: 2.1,
      orbitRadius: 29,
      orbitSpeed: 0.027,
      orbitPhase: 5.6,
      orbitTilt: -0.09,
      spinSpeed: 0.16,
      color: '#4f86f7',
      glow: '#8fc0ff',
      moons: [{ radius: 0.42, distance: 3.4, speed: 0.55, color: '#e8eefc' }],
    },
  },
  {
    id: 'signal',
    label: 'Signal',
    bodyName: 'Relay Station',
    tagline: 'Deep-space comms. Transmit an idea.',
    body: {
      radius: 1.0,
      orbitRadius: 36,
      orbitSpeed: 0.02,
      orbitPhase: 1.1,
      orbitTilt: 0.33,
      spinSpeed: 0.5,
      color: '#f472b6',
      glow: '#ffb0d8',
      ring: { inner: 1.6, outer: 2.1, color: '#ffc2e0', tilt: 1.15 },
    },
  },
];

export const sectionIds = sections.map((s) => s.id);

export const sectionById = Object.fromEntries(sections.map((s) => [s.id, s])) as Record<
  Section['id'],
  Section
>;

/** Sections that get their own scrollable content panel. `home` is the hero. */
export const navSections = sections.filter((s) => s.id !== 'home');
