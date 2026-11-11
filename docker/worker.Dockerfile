FROM oven/bun:1

# Server worker image: runs the slicing worker and (optionally) DragonFruit CLI on the server.
# Provide DragonFruit server assets via docker/dragonfruit/ (bin, profiles, plugins, install.sh).
WORKDIR /app

# System deps for Prisma/Node tooling and common CLI runtimes; extend docker/dragonfruit/install.sh if needed.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl curl bash \
  && rm -rf /var/lib/apt/lists/*

# Copy manifests first for better layer caching
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/contracts/package.json packages/contracts/
COPY packages/pricing/package.json packages/pricing/
COPY prisma ./prisma

# Install dependencies (best-effort for workspaces present in image)
RUN bun install || true

# Copy source
COPY . .

# Generate Prisma client
RUN bunx prisma generate || true

# Optional DragonFruit server assets (provided on the deployment server)
COPY docker/dragonfruit ./docker/dragonfruit
RUN mkdir -p /app/config/dragonfruit-profiles /app/config/dragonfruit-plugins /usr/local/bin \
  && if [ -d ./docker/dragonfruit/bin ]; then cp -a ./docker/dragonfruit/bin/. /usr/local/bin/ 2>/dev/null || true; fi \
  && if [ -d ./docker/dragonfruit/profiles ]; then cp -a ./docker/dragonfruit/profiles/. /app/config/dragonfruit-profiles/ 2>/dev/null || true; fi \
  && if [ -d ./docker/dragonfruit/plugins ]; then cp -a ./docker/dragonfruit/plugins/. /app/config/dragonfruit-plugins/ 2>/dev/null || true; fi \
  && chmod +x /usr/local/bin/* 2>/dev/null || true \
  && if [ -f ./docker/dragonfruit/install.sh ]; then chmod +x ./docker/dragonfruit/install.sh && ./docker/dragonfruit/install.sh; fi

ENV NODE_ENV=production \
    DRAGONFRUIT_CLI_PATH=/usr/local/bin/dragonfruit \
    DRAGONFRUIT_MODE=auto \
    DRAGONFRUIT_ALLOWED_PROFILES_DIR=/app/config/dragonfruit-profiles

WORKDIR /app
CMD ["bun", "apps/worker/src/index.ts"]