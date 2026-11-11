#!/bin/sh
# Optional server-side DragonFruit CLI installation hook.
# This script runs during `docker build` of the worker image when present and executable.
#
# Use this on the SERVER to install the headless DragonFruit CLI into the image, for example:
#   - install a vendor-provided .deb/.tar.gz CLI package
#   - copy/link a CLI binary to /usr/local/bin/dragonfruit
#   - install required runtime libraries for the CLI
#
# Keep this script non-interactive and fail fast on errors.
# Example (replace with your real install steps):
#   # cp /tmp/build/dragonfruit /usr/local/bin/dragonfruit && chmod +x /usr/local/bin/dragonfruit
#
# If you provide CLI binaries in docker/dragonfruit/bin/ they are copied automatically by the Dockerfile.
# If you provide profiles/plugins in docker/dragonfruit/profiles|plugins they are copied automatically.
set -eu

echo "[dragonfruit-install] No custom install steps defined (docker/dragonfruit/install.sh)."
echo "[dragonfruit-install] Provide a DragonFruit CLI binary in docker/dragonfruit/bin/ or customize this script on the server."