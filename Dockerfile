# Multi-stage Dockerfile for data-gov-il-mcp
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDeps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy only what's needed to run
COPY package.json package-lock.json ./
# Install production deps only
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Default to HTTP transport (use stdio.js for stdio mode)
ENV NODE_ENV=production
ENV TRANSPORT=http
ENV PORT=3664
ENV HOST=0.0.0.0

EXPOSE 3664

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3664/health || exit 1

CMD ["node", "dist/bin/http.js"]
