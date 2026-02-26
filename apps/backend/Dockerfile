FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
RUN pnpm --filter @bilibili-monitor/shared build
RUN pnpm --filter backend build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]
