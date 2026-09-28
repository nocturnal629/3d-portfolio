import { FiArrowUpRight } from 'react-icons/fi';
import ProjectCard from '@/components/ui/ProjectCard';
import SectionShell from '@/components/ui/SectionShell';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';

export default function Projects() {
  return (
    <SectionShell id="projects">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </div>

      <div className="mt-6 text-center">
        <a
          href={profile.socials.githubRepos}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-nova/30 bg-nova/10 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-nova transition-colors hover:bg-nova/20"
        >
          All repositories
          <FiArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </SectionShell>
  );
}
