import type { IconType } from 'react-icons';
import { DiPython, DiJavascript1, DiReact, DiNodejs, DiMongodb, DiLinux, DiRedis, DiPostgresql } from 'react-icons/di';
import {
  SiTypescript,
  SiGraphql,
  SiNextdotjs,
  SiFastapi,
  SiFlask,
  SiSupabase,
  SiGooglecloud,
  SiGit,
  SiDocker,
  SiKubernetes,
  SiWordpress,
} from 'react-icons/si';
// Simple Icons dropped the Amazon/AWS marks over trademark policy, so the
// AWS logo comes from Font Awesome's brand set instead.
import { FaAws, FaDatabase, FaTools } from 'react-icons/fa';
import { AiFillApi } from 'react-icons/ai';
import { BsCodeSlash, BsDatabase, BsCloud, BsGear, BsRobot } from 'react-icons/bs';
import { MdDevices, MdWeb } from 'react-icons/md';

/** Icon for a skill *category*, keyed by `SkillCategory.name`. */
export const categoryIcons: Record<string, IconType> = {
  Languages: BsCodeSlash,
  Frameworks: MdDevices,
  'APIs & Integration': AiFillApi,
  'AI & Agents': BsRobot,
  Databases: BsDatabase,
  'Cloud & Infrastructure': BsCloud,
  'CMS & Web Platforms': MdWeb,
  'Tools & Practices': FaTools,
};

/** Icon for an individual skill. Skills absent from this map render as a
 *  plain text chip, which is the intended fallback — not every skill needs
 *  a logo. */
export const skillIcons: Record<string, IconType> = {
  Python: DiPython,
  TypeScript: SiTypescript,
  JavaScript: DiJavascript1,
  GraphQL: SiGraphql,
  'Next.js': SiNextdotjs,
  React: DiReact,
  'Node.js': DiNodejs,
  FastAPI: SiFastapi,
  Flask: SiFlask,
  'REST APIs': AiFillApi,
  MongoDB: DiMongodb,
  Redis: DiRedis,
  PostgreSQL: DiPostgresql,
  Supabase: SiSupabase,
  NeonDB: FaDatabase,
  'Linux Servers': DiLinux,
  AWS: FaAws,
  GCP: SiGooglecloud,
  WordPress: SiWordpress,
  Elementor: MdDevices,
  Git: SiGit,
  'CI/CD': BsGear,
  Docker: SiDocker,
  Kubernetes: SiKubernetes,
  'Agile Development': FaTools,
};
