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

RUN bun install --frozen-lockfile

# Copy source
COPY . .

RUN bunx prisma generate

# Optional DragonFruit server assets (provided on the deployment server)
COPY docker/dragonfruit ./docker/dragonfruit
RUN mkdir -p /app/config/dragonfruit-profiles /app/config/dragonfruit-plugins /usr/local/bin \
  && cp -a ./docker/dragonfruit/bin/. /usr/local/bin/ \
  && cp -a ./docker/dragonfruit/profiles/. /app/config/dragonfruit-profiles/ \
  && cp -a ./docker/dragonfruit/plugins/. /app/config/dragonfruit-plugins/ \
  && find /usr/local/bin -maxdepth 1 -type f -exec chmod +x {} + \
  && chmod +x ./docker/dragonfruit/install.sh \
  && ./docker/dragonfruit/install.sh

ENV NODE_ENV=production \
    DRAGONFRUIT_CLI_PATH=/usr/local/bin/dragonfruit \
    DRAGONFRUIT_MODE=auto \
    DRAGONFRUIT_ALLOWED_PROFILES_DIR=/app/config/dragonfruit-profiles

WORKDIR /app
CMD ["bun", "apps/worker/src/index.ts"]
