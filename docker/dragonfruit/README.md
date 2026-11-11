# DragonFruit server assets (Docker build context)

This directory is used when building the **server** worker image so DragonFruit CLI runs on the server/container, not on a developer laptop.

## How to provide the CLI on the server

1. **Binary:** place the headless `dragonfruit` CLI executable in `docker/dragonfruit/bin/` (it will be copied to `/usr/local/bin/` in the worker image). Make it executable (`chmod +x`).
2. **Profiles:** place authorized printer/material/profile files in `docker/dragonfruit/profiles/` (copied to `/app/config/dragonfruit-profiles` in the image).
3. **Plugins:** place required plugins/resources in `docker/dragonfruit/plugins/` (copied to `/app/config/dragonfruit-plugins`).
4. **Custom install:** edit `install.sh` if the CLI requires package installation or extra runtime dependencies.

Then build on the server, for example:

```bash
docker compose build worker
docker compose up -d postgres redis worker
```

Configure `DRAGONFRUIT_CLI_PATH` (default `/usr/local/bin/dragonfruit` in the server image), `DRAGONFRUIT_MODE=cli|auto`, and `DRAGONFRUIT_CLI_ATTEMPTS_JSON` if the real CLI args/JSON differ from defaults. See `docs/ops/deploy-dragonfruit-server.md` and `docs/poc/dragonfruit-cli.md`.

> Do not commit proprietary binaries or licensed assets unless you are allowed to. Keep server-specific binaries on the deployment server or in a private artifact store.