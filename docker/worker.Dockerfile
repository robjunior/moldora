FROM oven/bun:1 AS base
WORKDIR /app
# Placeholder Dockerfile for worker; DragonFruit CLI binary/image to be added in POC real env.
COPY . .
CMD ["bun", "apps/worker/src/index.ts"]
