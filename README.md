# 3D Portfolio — a solar system you can scroll through

A space-themed portfolio built as a single WebGL solar system. Each section of
the portfolio is a celestial body; scrolling the page flies a camera between
them. An onboard AI called **NOVA** answers questions about the work — grounded
in the site's own content — and steers the camera to whichever world holds the
answer.

Same content as [the original portfolio](https://github.com/nocturnal629/portfolio),
rebuilt around a 3D scene.

## Features

- **Scroll-driven 3D scene** — a persistent `three.js` solar system with a
  procedural star, orbiting planets with rings and moons, fresnel atmospheres,
  a nebula, and bloom. Page scroll drives the camera; the content stays as
  ordinary DOM, so the site remains accessible, indexable, and readable with
  JavaScript disabled.
- **NOVA, the onboard AI** — a HUD console backed by CloudIQ. It answers only
  from the site's real content, and can fly the camera to the relevant section.
- **Recruiter fit-check** — paste a job description and NOVA grades the match
  against the real record, naming gaps rather than glossing over them.
- **Graceful degradation** — respects `prefers-reduced-motion`, drops
  post-processing on low-core and mobile devices, and offers a persistent
  "3D off" toggle that swaps in a pure-CSS starfield.
- **Bot honeypot** — recon probes get logged; credential scrapers get a decoy
  `.env` with canary tokens.
- **Documented API** — a FastAPI harness and pytest suite that run against the
  real routes, not mocks.

## Tech stack

| Layer          | Choice                                                 |
| -------------- | ------------------------------------------------------ |
| Framework      | Next.js 16 (App Router, Turbopack)                     |
| Language       | TypeScript 6                                           |
| 3D             | three.js · @react-three/fiber · drei · postprocessing  |
| State          | Zustand                                                |
| Styling        | Tailwind CSS v4 (CSS-first config, no JS config file)  |
| AI gateway     | CloudIQ (self-hosted)                                  |
| Storage        | Vercel Blob                                            |
| API tests      | FastAPI + pytest                                       |

## Getting started

Requires Node.js 20.9+.

```bash
npm install
cp .env.local.example .env.local   # then fill in the values you need
npm run dev
```

Open <http://localhost:3002>.

Everything works without any environment variables except NOVA (which returns
a clean 503) and persistence for idea submissions.

### Scripts

```bash
npm run dev        # dev server on port 3002
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Deployment

Two supported paths. Both build from the same source; `output: 'standalone'`
in `next.config.ts` serves the container path and is ignored by Vercel.

### 1. Vercel, from the GitHub repo

Import the repository in the Vercel dashboard, add the environment variables
above under Settings → Environment Variables, and deploy. Vercel detects
Next.js and needs no further configuration. Pushes to `main` redeploy.

This is the recommended path: it is the only one that gets Next.js' native
image optimization, edge caching, and Vercel Blob's zero-config binding.

### 2. Docker

```bash
docker build -t 3d-portfolio .
docker run -p 3002:3000 --env-file .env.local 3d-portfolio
```

Or with Compose, which reads the same variables from your shell or a `.env`:

```bash
docker compose up --build
```

The image is a multi-stage build on `node:22-alpine`, runs as a non-root user,
and copies only the traced standalone output — not the full `node_modules`. No
build-time secrets are needed, so one image is promotable across environments.

This container runs anywhere that takes a Docker image: Render, Fly.io, Google
Cloud Run, a VPS, Kubernetes. Note that Vercel's own Next.js pipeline builds
from source rather than from a Dockerfile, so on Vercel use path 1 — the
Dockerfile is what makes the project portable *off* Vercel.

## How the 3D works

`src/data/sections.ts` is the single ordered list of sections, and index N is
both the Nth scroll stop and the Nth celestial body.

`ScrollDriver` measures the section elements and writes a *fractional* index
(`1.5` = halfway between two planets) into a Zustand store. `CameraRig` reads
that value inside the render loop — not through a subscription — and
interpolates the camera between waypoints, tracking each planet's live orbital
position.

Scroll is the only source of truth for the camera. The HUD and NOVA both
navigate by scrolling the page and letting the camera follow, so the scene and
the document can never disagree about where you are.

Planet colours, sizes, orbits, rings and moons are all data in
`sections.ts`; the textures are generated at runtime from canvas gradients, so
there are no binary art assets in the repo.

## NOVA

`src/app/api/chat/route.ts` proxies to CloudIQ, a self-hosted AI gateway. The
system prompt is assembled per request by
`src/lib/knowledge.ts`, which renders every content file into a plain-text
dossier — so NOVA answers from the same data the page renders, and editing
`src/data/` updates both at once.

The model signals navigation by ending a reply with `[[NAV: <section-id>]]`.
That directive is stripped server-side before the reply reaches the browser,
with a keyword fallback for when a smaller model in CloudIQ's chain forgets to
emit it.

**On rate limits:** every visitor shares one CloudIQ key, capped upstream at 10
requests/minute and 200/day. A tighter per-IP limit in
`src/lib/rate-limit.ts` stops a single visitor exhausting that. It is
in-memory and per-instance, which on serverless means it is a speed bump
rather than a guarantee — swap in Vercel KV or Upstash if the site gets real
traffic.

## API documentation and tests

See [`api-tests/README.md`](api-tests/README.md). A FastAPI app proxies to the
real Next.js routes and documents their contracts, and the pytest suite runs as
an integration test against the live server. The chat tests exercise validation
only by default, so a test run costs nothing against the shared API key.

## License

MIT — see [LICENSE](LICENSE).
