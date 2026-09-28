import { profile } from '@/data/profile';

export default function Footer() {
  return (
    <footer className="relative px-4 pb-10 text-center sm:px-6 lg:pl-32">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-slate-600">
        © {new Date().getFullYear()} {profile.name} · Built with Next.js, three.js and CloudIQ
      </p>

      {/* Invisible to real visitors and skipped by screen readers; only a bot
          that blindly crawls every <a href> will ever request this. The proxy
          logs any hit as a honeypot trap. */}
      <a
        href="/staff-portal/login"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        rel="nofollow"
      >
        Staff Portal Login
      </a>
    </footer>
  );
}
