'use client';

import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { FiChevronDown } from 'react-icons/fi';
import { profile } from '@/data/profile';
import { navSections } from '@/data/sections';
import { flyTo } from '@/lib/scroll';

export default function Hero() {
  return (
    <section id="home" className="relative flex min-h-screen items-center px-4 sm:px-6 lg:pl-32">
      <div className="relative mx-auto w-full max-w-3xl text-center lg:text-left">
        {/* The bodies orbit, so sooner or later one drifts behind this copy
            no matter where the camera sits. A soft local scrim guarantees
            contrast without boxing the hero into a panel — kept deliberately
            gentle so it darkens the backdrop rather than erasing it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--color-void)_78%,transparent)_0%,color-mix(in_srgb,var(--color-void)_52%,transparent)_45%,transparent_72%)]"
        />

        <p className="hud-label">
          {profile.callsign} · {profile.location}
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-50 sm:text-6xl">
          {profile.name}
        </h1>

        <p className="mt-3 bg-gradient-to-r from-nova via-plasma to-relay bg-clip-text text-lg font-medium text-transparent sm:text-2xl">
          {profile.role}
        </p>

        <p className="text-balance-pretty mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base lg:mx-0">
          A portfolio built as a solar system. Scroll to fly between worlds, or ask NOVA — the
          onboard AI — and it will take you there.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
          {navSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => flyTo(section.id)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-nova/40 hover:bg-nova/10 hover:text-nova"
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-4 lg:justify-start">
          <a
            href={profile.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 transition-colors hover:text-nova"
          >
            <FaGithub className="h-6 w-6" aria-hidden="true" />
            <span className="sr-only">GitHub</span>
          </a>
          <a
            href={profile.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 transition-colors hover:text-nova"
          >
            <FaLinkedin className="h-6 w-6" aria-hidden="true" />
            <span className="sr-only">LinkedIn</span>
          </a>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
        aria-hidden="true"
      >
        <FiChevronDown className="h-5 w-5 animate-cosmos-pulse text-nova/60" />
      </div>
    </section>
  );
}
