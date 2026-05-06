# syntax=docker/dockerfile:1.7

# ─── Build stage ──────────────────────────────────────────────────────────────
# Compiles native deps (better-sqlite3) against the same Alpine + libc the
# runtime stage uses, so the prebuilt binary can simply be copied across.
FROM node:20-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# su-exec lets the entrypoint fix /data permissions then drop to non-root
RUN apk add --no-cache su-exec \
 && addgroup -S liftiq && adduser -S liftiq -G liftiq \
 && mkdir -p /data

WORKDIR /app

COPY --from=build --chown=liftiq:liftiq /app/node_modules ./node_modules
COPY --from=build --chown=liftiq:liftiq /app/package.json /app/package-lock.json ./
COPY --from=build --chown=liftiq:liftiq /app/src ./src
COPY --from=build --chown=liftiq:liftiq /app/public ./public

# Entrypoint runs as root, fixes volume ownership, then drops to liftiq
COPY --from=build --chmod=755 /app/entrypoint.sh /entrypoint.sh

ENV DB_PATH=/data/liftiq.db
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["/entrypoint.sh"]
