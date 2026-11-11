# Placeholder for DragonFruit CLI runner image.
# Install DragonFruit CLI + required printer/material profiles/plugins here.
# Example:
# FROM ubuntu:24.04
# RUN ... install dragonfruit ...
# ENTRYPOINT ["dragonfruit"]
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /work
CMD ["sh", "-c", "echo 'DragonFruit CLI not installed in this image. Provide binary/profiles to complete POC.'; exit 1"]
