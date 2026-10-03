# Multi-stage Dockerfile for Haven Art (Astro 7 + Svelte 5 + Node standalone + SQLite)
# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Install native dependencies required for compiling better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build & typecheck)
RUN npm ci

# Copy application source code
COPY . .

# Run production build & verify assets
ENV NODE_ENV=production
RUN npm run build

# Remove development dependencies, retaining only production packages with native compiled bindings
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install minimal runtime libraries for SQLite
RUN apk add --no-cache sqlite-libs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
ENV HAVEN_SQLITE_PATH=/app/data/haven.db
ENV HAVEN_SERVER_DB_PATH=/app/data/server-db.json

# Create non-root user and persistent data directory
RUN addgroup -S haven && adduser -S haven -G haven && \
    mkdir -p /app/data && \
    chown -R haven:haven /app

# Copy production node_modules from builder (already pruned and containing native better-sqlite3)
COPY --from=builder --chown=haven:haven /app/node_modules ./node_modules
COPY --from=builder --chown=haven:haven /app/dist ./dist
COPY --from=builder --chown=haven:haven /app/public ./public
COPY --from=builder --chown=haven:haven /app/scripts ./scripts
COPY --from=builder --chown=haven:haven /app/package.json ./package.json

# Persistent volume for SQLite database and server storage
VOLUME ["/app/data"]

# Switch to non-root user
USER haven

EXPOSE 4321

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4321/ || exit 1

CMD ["node", "dist/server/entry.mjs"]
