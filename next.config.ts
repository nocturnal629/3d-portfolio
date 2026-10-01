import type { NextConfig } from 'next';

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
};

export default nextConfig;
