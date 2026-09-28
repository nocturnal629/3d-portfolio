import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import NovaConsole from '@/components/features/NovaConsole';
import ScrollDriver from '@/components/features/ScrollDriver';
import NavRail from '@/components/hud/NavRail';
import QualityToggle from '@/components/hud/QualityToggle';
import Readout from '@/components/hud/Readout';
import ScrollProgress from '@/components/hud/ScrollProgress';
import CosmosBackdrop from '@/components/three/CosmosBackdrop';
import { profile } from '@/data/profile';

const title = `${profile.name} — ${profile.role}`;
const description =
  'A 3D, space-themed portfolio: scroll to fly between worlds, or ask NOVA, the onboard AI, about the work. Full Stack LLM Developer specializing in Python, FastAPI, AWS, and TypeScript.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The scene is calibrated to the viewport, but pinch-zoom is an
  // accessibility affordance and is deliberately left enabled.
  themeColor: '#04060f',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(profile.site),
  title,
  description,
  icons: { icon: '/favicon.png', shortcut: '/favicon.png', apple: '/favicon.png' },
  openGraph: {
    title,
    description,
    url: profile.site,
    siteName: profile.name,
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/favicon.png', width: 1200, height: 630, alt: title, type: 'image/png' }],
  },
  twitter: { card: 'summary_large_image', title, description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <a
          href="#projects"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:text-slate-100"
        >
          Skip to content
        </a>

        <CosmosBackdrop />
        <ScrollDriver />

        <ScrollProgress />
        <Readout />
        <NavRail />

        <div className="pointer-events-none fixed right-4 top-4 z-30 sm:right-6 sm:top-6">
          <QualityToggle />
        </div>

        {/* Sits above the fixed backdrop and owns all pointer interaction. */}
        <main className="relative z-10">{children}</main>

        <NovaConsole />
        <Analytics />
      </body>
    </html>
  );
}
