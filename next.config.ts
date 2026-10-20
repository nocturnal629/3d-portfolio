import type { NextConfig } from 'next';

// A separate static site served under /santa-claude without changing the URL.
const SANTA_CLAUDE = 'https://santa-claude.vercel.app';

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules actually traced as reachable. The Dockerfile copies that
  // instead of the whole dependency tree. Vercel ignores this setting and
  // uses its own build output, so the same config serves both deploy paths.
  output: 'standalone',

  images: {
    // Every image is local (public/), so no remote patterns are needed.
    formats: ['image/avif', 'image/webp'],
  },

  async rewrites() {
    return {
      afterFiles: [
        { source: '/santa-claude', destination: `${SANTA_CLAUDE}/` },
        { source: '/santa-claude/:path*', destination: `${SANTA_CLAUDE}/:path*` },
      ],

      // Next strips trailing slashes, so the page always lands on
      // `/santa-claude`, and its *relative* asset URLs (`css/styles.css`,
      // `assets/...`) resolve against the site root instead of
      // `/santa-claude/`. Its wish form calls `/api/wish` and its admin page
      // calls `/api/wishes`, both with absolute paths. Proxy those root paths
      // too. `fallback` only runs after this app's own pages and public files
      // have missed, so it cannot shadow them.
      fallback: [
        { source: '/css/:path*', destination: `${SANTA_CLAUDE}/css/:path*` },
        { source: '/js/:path*', destination: `${SANTA_CLAUDE}/js/:path*` },
        { source: '/assets/:path*', destination: `${SANTA_CLAUDE}/assets/:path*` },
        { source: '/audio/:path*', destination: `${SANTA_CLAUDE}/audio/:path*` },
        { source: '/api/wish', destination: `${SANTA_CLAUDE}/api/wish` },
        { source: '/api/wishes', destination: `${SANTA_CLAUDE}/api/wishes` },
      ],
    };
  },
};

export default nextConfig;
