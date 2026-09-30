# Simple POS PWA (ADR-0012). Build context: repository root (needs docs/api/openapi.yaml for type generation).
FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json frontend/package.json
COPY e2e/package.json e2e/package.json
RUN pnpm install --frozen-lockfile --filter frontend...
COPY docs/api/openapi.yaml docs/api/openapi.yaml
COPY frontend/ frontend/
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN test -n "$VITE_API_BASE_URL" && pnpm --filter frontend build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
