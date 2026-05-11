#!/bin/sh
mount -t tmpfs -o size=512m tmpfs /dev/shm 2>/dev/null \
  && echo "[entrypoint] /dev/shm remontado a 512MB" \
  || echo "[entrypoint] No se pudo remontar /dev/shm — usando default"
exec "$@"
