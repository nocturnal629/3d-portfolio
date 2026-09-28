import Image from 'next/image';
import SectionShell from '@/components/ui/SectionShell';
import { experiences } from '@/data/experience';

export default function Experience() {
  return (
    <SectionShell id="experience">
      {/* A single vertical rail with a node per role — the timeline reading
          of "Chronos" that the section is named for. */}
      <ol className="relative space-y-8 border-l border-white/10 pl-6">
        {experiences.map((job) => (
          <li key={`${job.company}-${job.period}`} className="relative">
            <span
              className="absolute -left-[1.6875rem] top-1.5 h-2.5 w-2.5 rounded-full border border-nova/60 bg-void"
              aria-hidden="true"
            />

            <div className="flex items-start gap-3">
              {job.logo && (
                <Image
                  src={job.logo}
                  alt=""
                  width={32}
                  height={32}
                  className="mt-0.5 h-8 w-8 shrink-0 rounded-md bg-white/90 object-contain p-1"
                />
              )}
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-50">{job.title}</h3>
                <p className="font-mono text-xs text-nova/80">
                  {job.company} · {job.period}
                </p>
              </div>
            </div>

            {job.responsibilities && (
              <ul className="mt-3 space-y-1.5">
                {job.responsibilities.map((item) => (
                  <Bullet key={item}>{item}</Bullet>
                ))}
              </ul>
            )}

            {job.roles?.map((role) => (
              <div key={role.label} className="mt-4">
                <p className="hud-label text-plasma">{role.label.replace(/^\[|\]$/g, '')}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {role.responsibilities.map((item) => (
                    <Bullet key={item}>{item}</Bullet>
                  ))}
                </ul>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-balance-pretty flex gap-2 text-sm leading-relaxed text-slate-400">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-nova/50" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
