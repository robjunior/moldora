# Optional standalone DragonFruit runtime image (server-side).
# The primary deployment path is docker/worker.Dockerfile, which builds the slicing worker
# with optional DragonFruit CLI assets from docker/dragonfruit/{bin,profiles,plugins,install.sh}.
# Use this file only if you need a separate CLI-only image for diagnostics or custom runs.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /work
COPY docker/dragonfruit/bin/ /usr/local/bin/
COPY docker/dragonfruit/profiles/ /app/config/dragonfruit-profiles/
COPY docker/dragonfruit/plugins/ /app/config/dragonfruit-plugins/
RUN chmod +x /usr/local/bin/* 2>/dev/null || true
CMD ["sh", "-c", "if command -v dragonfruit >/dev/null 2>&1; then dragonfruit --help || true; else echo 'DragonFruit CLI not installed. Place binary in docker/dragonfruit/bin/ or use docker/worker.Dockerfile.'; exit 1; fi"]