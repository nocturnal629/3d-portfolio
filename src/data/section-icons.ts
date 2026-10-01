import type { IconType } from 'react-icons';
import {
  BsRocketTakeoff,
  BsBriefcase,
  BsPatchCheck,
  BsPersonBadge,
  BsBroadcast,
  BsBrightnessHigh,
} from 'react-icons/bs';
import type { SectionId } from '@/types';

/** Icon for a section, keyed by `Section.id`.
 *
 *  Kept out of `sections.ts` on purpose: that file is imported server-side by
 *  `lib/knowledge.ts` (to build NOVA's dossier) and by the Zustand store, and
 *  pulling react-icons into those paths would drag the whole icon tree into
 *  the `/api/chat` serverless bundle. Same split as `skills.ts` /
 *  `skill-icons.ts`. Only client components should import this map. */
export const sectionIcons: Record<SectionId, IconType> = {
  home: BsBrightnessHigh,
  projects: BsRocketTakeoff,
  experience: BsBriefcase,
  certifications: BsPatchCheck,
  about: BsPersonBadge,
  signal: BsBroadcast,
};
