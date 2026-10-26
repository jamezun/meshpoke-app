# Build from repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @meshpoke/api
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @meshpoke/shared build \
 && pnpm --filter @meshpoke/api build \
 && pnpm --filter @meshpoke/api deploy --prod /out

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/drizzle ./drizzle
EXPOSE 8080
USER node
CMD ["node", "dist/server.js"]
