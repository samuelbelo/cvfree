# syntax=docker/dockerfile:1

# ---- dependencies ---------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runtime --------------------------------------------------------------
FROM node:24-alpine AS runtime
# Chromium renders the PDFs. tini reaps its child processes.
RUN apk add --no-cache chromium nss freetype harfbuzz ttf-freefont font-noto-emoji tini wget

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

WORKDIR /app
RUN addgroup -S cvfree && adduser -S cvfree -G cvfree \
 && mkdir -p /data && chown cvfree:cvfree /data

COPY --from=build --chown=cvfree:cvfree /app/public ./public
COPY --from=build --chown=cvfree:cvfree /app/.next/standalone ./
COPY --from=build --chown=cvfree:cvfree /app/.next/static ./.next/static

USER cvfree
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
