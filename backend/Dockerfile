# syntax=docker/dockerfile:1.7
# Multi-stage build producing one minimal image used for both `api` and `worker` process types.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/contracts/package.json packages/contracts/
COPY backend/package.json backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/tsconfig packages/tsconfig
COPY packages/contracts packages/contracts
COPY backend backend
RUN pnpm --filter @fingerpay/contracts build && pnpm --filter @fingerpay/backend build
RUN pnpm --filter @fingerpay/backend --prod deploy /prod/backend

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=nonroot:nonroot /prod/backend/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/backend/dist ./dist
COPY --from=build --chown=nonroot:nonroot /app/backend/db ./db
COPY --from=build --chown=nonroot:nonroot /app/backend/package.json ./package.json
EXPOSE 4000
USER nonroot
CMD ["dist/main.api.js"]
