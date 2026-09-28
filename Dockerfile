# syntax=docker/dockerfile:1

# Multi-stage build producing a minimal runtime image from Next.js'
# `output: 'standalone'` bundle (configured in next.config.ts). Only the
# traced server, the static assets and public/ end up in the final layer —
# node_modules is not copied wholesale.

# ---- deps -------------------------------------------------------------
# Next.js 16 requires Node 20.9+; 22 is the current LTS.
FROM node:22-alpine AS deps
WORKDIR /app

# Copied on their own so this layer is cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci


# ---- builder ----------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Telemetry is off by default in CI-like environments, but be explicit so a
# container build never phones home.
ENV NEXT_TELEMETRY_DISABLED=1

# No build-time secrets are needed: every env var this app reads
# (CLOUDIQ_API_KEY, BLOB_READ_WRITE_TOKEN, HONEYPOT_*) is read at request
# time inside route handlers, so the same image is promotable across
# environments.
RUN npm run build


# ---- runner -----------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# The standalone output already contains a server.js plus exactly the
# node_modules it traced as reachable.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Fails the container's health check if the app stops serving, which is what
# orchestrators (Compose, Render, Cloud Run, Kubernetes) restart on.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
