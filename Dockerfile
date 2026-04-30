# syntax=docker/dockerfile:1.4
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# ── 1. Instala dependências ───────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store-frontend,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ── 2. Build ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* são inlined no bundle em build-time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ORGANIZER_APP_HOST
ARG NEXT_PUBLIC_ROOT_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ORGANIZER_APP_HOST=$NEXT_PUBLIC_ORGANIZER_APP_HOST
ENV NEXT_PUBLIC_ROOT_SITE_URL=$NEXT_PUBLIC_ROOT_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ── 3. Runner mínimo (standalone) ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
