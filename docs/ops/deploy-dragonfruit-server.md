# Deploy DragonFruit CLI on the Server (Worker)

This project’s slicing runs in the **worker** service (`apps/worker`) using BullMQ/Redis and the DragonFruit adapter. DragonFruit CLI should be installed **on the deployment server** (inside the worker container/image), not on a developer laptop.

> Current repo status: the adapter and queue pipeline are implemented and validated in `mock` mode. Real CLI subcommands/JSON output must be confirmed against the actual headless DragonFruit CLI you deploy.

## 1. Prepare server assets

On the server (clone of this repo), provide the headless DragonFruit CLI and any required profiles/plugins:

- `docker/dragonfruit/bin/dragonfruit` — headless CLI executable (copied to `/usr/local/bin/dragonfruit` in the worker image). `chmod +x` it.
- `docker/dragonfruit/profiles/` — authorized printer/material/profile files (copied to `/app/config/dragonfruit-profiles`).
- `docker/dragonfruit/plugins/` — plugins/resources if required (copied to `/app/config/dragonfruit-plugins`).
- `docker/dragonfruit/install.sh` — optional custom install steps (packages/runtime deps). Runs during worker image build.

Do not commit proprietary/licensed binaries unless permitted; keep them on the server or in a private artifact store.

## 2. Configure environment

Create/update `.env` on the server (see `.env.example`):

```env
DATABASE_URL=postgresql://print3d:print3d@postgres:5432/print3d?schema=public
REDIS_URL=redis://redis:6379
SLICING_QUEUE_NAME=slicing-jobs

DRAGONFRUIT_MODE=cli        # or auto once validated
DRAGONFRUIT_CLI_PATH=/usr/local/bin/dragonfruit
DRAGONFRUIT_ALLOWED_PROFILES_DIR=/app/config/dragonfruit-profiles

# If the real CLI args differ from defaults, override attempts:
# DRAGONFRUIT_CLI_ATTEMPTS_JSON='[{"label":"mesh_info","args":["<cmd>","<subcmd>","--json","{file}"]},{"label":"slice_run","args":["<cmd>","<subcmd>","--json","{file}"]}]'
# Placeholders: {file}, {printerProfile}, {materialProfile}
```

## 3. Build and run on the server

```bash
# from repo root on the server
docker compose build worker
docker compose up -d postgres redis worker

# apply schema / seed if needed
# docker compose run --rm worker bunx prisma db push
# docker compose run --rm worker bun prisma/seed.ts
```

`docker-compose.yml` includes a `worker` service wired to Postgres/Redis, mounts `./storage` and `./config/dragonfruit-profiles|plugins`, and sets DragonFruit env vars. Enable `api`/`web` services when ready for full server deployment.

## 4. Validate the real CLI (required)

1. Confirm the headless CLI works inside the worker container:
   ```bash
   docker compose exec worker /usr/local/bin/dragonfruit --help
   docker compose exec worker /usr/local/bin/dragonfruit --version
   ```
2. Capture real subcommands/flags and JSON output for mesh/slice analysis with authorized profiles.
3. Set `DRAGONFRUIT_CLI_ATTEMPTS_JSON` to match the real interface if needed.
4. Run a one-off analysis:
   ```bash
   docker compose exec worker sh -lc 'DRAGONFRUIT_MODE=cli bun apps/worker/src/run-once.ts --file /app/storage/uploads/<model>.stl --no-persist'
   ```
5. Run an end-to-end queue job and verify `SlicingJob` becomes `SUCCEEDED` with normalized results.

## 5. Operational notes

- Worker runs with no shell command construction and profile-path restrictions (`DRAGONFRUIT_ALLOWED_PROFILES_DIR`); keep the container least-privilege and timeouts configured (`SLICING_JOB_TIMEOUT_MS`).
- `auto` mode falls back to mock if the configured explicit CLI path is missing; use `cli` on the server once validated to fail fast on misconfiguration.
- If MinIO/S3 is not available, local storage fallback is under `./storage` (mounted into the worker). Adjust for your server’s persistent storage.
- Track normalization/schema adjustments and metric validation in `docs/poc/dragonfruit-cli.md` and `docs/poc/metrics-validation.md`.