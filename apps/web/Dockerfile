FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @bilibili-monitor/shared build
RUN pnpm --filter web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public 2>/dev/null || true

EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/web/server.js"]
