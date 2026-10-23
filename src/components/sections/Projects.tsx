import { FiArrowUpRight } from 'react-icons/fi';
import ExpandableGrid from '@/components/ui/ExpandableGrid';
import ProjectCard from '@/components/ui/ProjectCard';
import SectionShell from '@/components/ui/SectionShell';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';

/** How many cards show before "Show more". Even, so the two-column grid ends
 *  on a full row; the order in `projects.ts` decides which ones those are. */
const FEATURED_PROJECT_COUNT = 6;

export default function Projects() {
  const card = (project: (typeof projects)[number]) => (
    <ProjectCard key={project.title} {...project} />
  );

  return (
    <SectionShell id="projects">
      <ExpandableGrid
        visible={projects.slice(0, FEATURED_PROJECT_COUNT).map(card)}
        hidden={projects.slice(FEATURED_PROJECT_COUNT).map(card)}
        hiddenCount={Math.max(0, projects.length - FEATURED_PROJECT_COUNT)}
        actions={
          <a
            href={profile.socials.githubRepos}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-nova/30 bg-nova/10 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-nova transition-colors hover:bg-nova/20"
          >
            All repositories
            <FiArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        }
      />
    </SectionShell>
  );
}
