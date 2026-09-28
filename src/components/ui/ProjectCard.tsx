import Image from 'next/image';
import { FiArrowUpRight } from 'react-icons/fi';
import type { Project } from '@/types';

export default function ProjectCard({ title, description, tech, link, image }: Project) {
  return (
    <article className="panel panel-hover flex flex-col overflow-hidden">
      {image && (
        <div className="relative aspect-video w-full border-b border-white/10">
          <Image
            src={image}
            alt={`${title} preview`}
            fill
            // Two columns at lg, one below — telling the optimizer that
            // avoids shipping a full-width source for a half-width slot.
            sizes="(min-width: 1024px) 24rem, 100vw"
            className="object-cover"
          />
          {/* Keeps bright screenshots from fighting the dark panel. */}
          <div className="absolute inset-0 bg-gradient-to-t from-panel/80 to-transparent" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-slate-50">{title}</h3>
        {/* Not flex-1: the grid already stretches cards to a shared row
            height, and letting the description absorb that slack opens a
            large gap mid-card on the entries that have no screenshot. */}
        <p className="text-balance-pretty mt-2 text-sm leading-relaxed text-slate-400">
          {description}
        </p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {tech.map((item) => (
            <li key={item} className="chip">
              {item}
            </li>
          ))}
        </ul>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 self-start font-mono text-xs uppercase tracking-[0.14em] text-nova hover:text-nova/80"
          >
            Open
            <FiArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
