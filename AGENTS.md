<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 3d-portfolio

A space-themed 3D portfolio. The whole site is one WebGL solar system that the
page scroll flies a camera through, with an AI console ("NOVA") grounded in the
site's own content.

## Commands

```bash
npm run dev        # dev server on http://localhost:3002
npm run build      # production build (Turbopack)
npm run start      # serve the production build
npm run lint       # eslint (next lint was removed in Next 16)
npm run typecheck  # tsc --noEmit
```

API integration tests (start the dev server first):

```bash
cd api-tests
.venv\Scripts\activate           # Windows
pip install -r requirements.txt  # first time only
pytest -v                        # validation contract only; no model calls
NOVA_LIVE_TESTS=1 pytest -v      # also runs the tests that really call CloudIQ
uvicorn app.main:app --reload --port 8000   # Swagger UI at /docs
```

## Architecture

### The scroll-to-camera pipeline

This is the core mechanism, and the one thing to understand before changing
anything visual:

1. `src/data/sections.ts` is the single ordered list of sections. Index N is
   both the Nth scroll stop **and** the Nth celestial body. `src/app/page.tsx`
   must render its sections in the same order.
2. `ScrollDriver` (`src/components/features/ScrollDriver.tsx`) measures each
   section element and writes a **fractional** section index (e.g. `1.5` =
   halfway between bodies 1 and 2) into the Zustand store.
3. `CameraRig` reads that value inside `useFrame` via `getProgress()` — never
   by subscribing — and lerps the camera between waypoints. Keeping scroll off
   React's render path is deliberate; do not convert this to `useState`.
4. Both the rig and the planet meshes compute positions with
   `bodyPosition()` from `src/lib/orbit.ts`, using the same `state.clock`
   time. That shared clock is what keeps the camera locked onto a moving
   planet.

Scroll is the **only** source of truth for the camera. HUD clicks and NOVA's
navigation both call `flyTo()` (`src/lib/scroll.ts`), which scrolls the page
and lets the rig follow. Never move the camera directly.

### Component layers

- `components/three/` — everything inside the `<Canvas>`, plus `CosmosBackdrop`,
  the client wrapper that dynamically imports the scene with `ssr: false`.
- `components/hud/` — fixed instrument chrome (nav rail, readout, progress bar,
  quality toggle).
- `components/features/` — stateful non-3D widgets (NOVA console, signal form,
  scroll driver).
- `components/sections/` — the scrollable DOM content.
- `components/ui/` — stateless primitives.

### Content data

All user-facing content lives in `src/data/*.ts`. Edit those files, never the
section components. `src/data/profile.ts` holds identity and the About prose.

`skills.ts` is deliberately icon-free so the server can import it; the icon
maps live separately in `skill-icons.ts`. Keep it that way — `knowledge.ts`
imports `skills.ts` inside a route handler, and re-adding icons would pull the
whole react-icons tree into the serverless bundle.

### NOVA / CloudIQ

`src/app/api/chat/route.ts` is a server-side proxy to CloudIQ (a self-hosted
Flask gateway in front of Accenture's ModelIQ). The API key never reaches the
browser.

- `src/lib/knowledge.ts` builds the system prompt by rendering every content
  file into a plain-text dossier. Adding a content file means adding it here
  too, or NOVA will not know about it.
- CloudIQ authenticates with `X-API-Key`, not a bearer token, and returns a
  `served_model` field naming which upstream model answered after its internal
  fallback chain.
- Supplying our own system message also suppresses CloudIQ's default "IQ Bot"
  identity prompt, which it only injects when a request has no system role.
- The model ends a reply with `[[NAV: <section-id>]]` to fly the camera.
  `src/lib/nav-intent.ts` strips that directive and falls back to keyword
  matching on the question, because the smaller models in CloudIQ's fallback
  chain often forget to emit it.
- **One API key is shared by every visitor**, and CloudIQ caps it at 10
  requests/minute and 200/day. `src/lib/rate-limit.ts` adds a tighter per-IP
  limit so one visitor cannot exhaust the site's budget. It is in-memory and
  per-instance — a speed bump, not a guarantee.
- The gateway-configured check runs *after* request validation, so the
  validation contract is testable without a key.

### Proxy honeypot (`src/proxy.ts`)

Intercepts bot reconnaissance probes. **Critical constraint**: the exported
`config.matcher` array must stay exactly in sync with `ENV_DECOY_PATH_LIST` and
`RECON_PROBE_PATHS` — Next.js statically parses `config.matcher` at build time,
so it cannot be a spread or a reference. A dev-mode check warns on drift. When
adding a trap path, add it in all three places.

Honeypot hits and idea submissions both persist to Vercel Blob. The SDK is
forced onto `process.env.BLOB_READ_WRITE_TOKEN` explicitly rather than OIDC
auto-detection, because OIDC fails outside an actual Vercel deployment.

### Styling

Tailwind v4, configured in CSS (`src/app/globals.css`) — there is no
`tailwind.config.js`. Tokens in `@theme` generate utilities: `--color-nova`
gives `text-nova`, `bg-nova`, and so on.

Two panel classes, and the difference matters:
- `.panel` — translucent, for content sections floating over the scene.
- `.panel-solid` — fully opaque, for overlay chrome (NOVA console, HUD
  buttons) that sits over page copy. Do not rely on `backdrop-filter` for
  legibility; it is unsupported often enough to matter.

The site is dark-only by design. No fonts are fetched at build or runtime —
the stacks are system fonts, so a Docker build needs no network for assets.

## Environment variables

Copy `.env.local.example` to `.env.local`. `CLOUDIQ_API_KEY` is required for
NOVA; without it `/api/chat` returns a clean 503 and the rest of the site works
normally. `BLOB_READ_WRITE_TOKEN` is required for idea submissions and honeypot
logging to persist; without it valid submissions 500 at the write step, which
the API tests account for.
