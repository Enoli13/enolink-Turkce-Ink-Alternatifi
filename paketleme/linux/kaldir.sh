#!/usr/bin/env bash
set -e
rm -rf "$HOME/.local/share/enolink"
rm -f "$HOME/.local/bin/enolink" "$HOME/.local/share/applications/enolink.desktop" \
      "$HOME/.local/share/icons/hicolor/512x512/apps/enolink.png" "$HOME/.local/share/mime/packages/enolink.xml"
update-mime-database "$HOME/.local/share/mime" >/dev/null 2>&1 || true
update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
echo "Enolink! kaldırıldı. (Ayarların ~/.config/Enolink içinde duruyor.)"
