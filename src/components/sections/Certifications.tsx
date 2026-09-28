import Image from 'next/image';
import { FiArrowUpRight } from 'react-icons/fi';
import SectionShell from '@/components/ui/SectionShell';
import { certifications } from '@/data/certifications';

export default function Certifications() {
  return (
    <SectionShell id="certifications">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {certifications.map((cert) => {
          const content = (
            <>
              <div className="relative h-16 w-16 shrink-0">
                <Image
                  src={cert.logo}
                  alt=""
                  fill
                  sizes="4rem"
                  className={`object-contain ${cert.logoClassName ?? ''}`}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-snug text-slate-50">{cert.name}</h3>
                <p className="mt-1 font-mono text-xs text-nova/80">{cert.issuer}</p>
                {cert.date && <p className="mt-0.5 text-xs text-slate-500">{cert.date}</p>}
                {cert.link && (
                  <span className="mt-2 inline-flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-slate-400">
                    Verify
                    <FiArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
              </div>
            </>
          );

          return (
            <li key={cert.name}>
              {cert.link ? (
                <a
                  href={cert.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="panel panel-hover flex h-full items-start gap-4 p-4"
                >
                  {content}
                </a>
              ) : (
                <div className="panel flex h-full items-start gap-4 p-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
