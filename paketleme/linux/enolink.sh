#!/bin/sh
# Enolink! başlatıcı (Wayland ve X11'de otomatik çalışır)
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/enolink" --ozone-platform-hint=auto "$@"
