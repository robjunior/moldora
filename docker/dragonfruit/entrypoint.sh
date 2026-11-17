#!/bin/sh
set -eu

cli="${DRAGONFRUIT_CLI_PATH:-/usr/local/bin/dragonfruit}"
if [ ! -x "$cli" ]; then
  echo "DragonFruit CLI is missing or not executable: $cli" >&2
  echo "Provide docker/dragonfruit/bin/dragonfruit or mount a server-installed binary." >&2
  exit 127
fi

exec "$cli" "$@"
