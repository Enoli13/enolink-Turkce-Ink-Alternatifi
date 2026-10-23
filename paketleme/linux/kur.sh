#!/usr/bin/env bash
# Enolink! — CachyOS / Arch / diğer Linux dağıtımları için kullanıcı kurulumu (root gerekmez)
set -e
KAYNAK="$(cd "$(dirname "$0")" && pwd)"
HEDEF="$HOME/.local/share/enolink"
echo "Enolink! kuruluyor → $HEDEF"
rm -rf "$HEDEF"; mkdir -p "$HEDEF"
cp -r "$KAYNAK"/. "$HEDEF"/
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications" "$HOME/.local/share/icons/hicolor/512x512/apps" "$HOME/.local/share/mime/packages"
ln -sf "$HEDEF/enolink.sh" "$HOME/.local/bin/enolink"
cp "$HEDEF/enolink.png" "$HOME/.local/share/icons/hicolor/512x512/apps/enolink.png"
sed -e "s|@YOL@|$HEDEF|" -e "s|@IKON@|enolink|" "$HEDEF/enolink.desktop" > "$HOME/.local/share/applications/enolink.desktop"
cp "$HEDEF/ink-mime.xml" "$HOME/.local/share/mime/packages/enolink.xml"
update-mime-database "$HOME/.local/share/mime" >/dev/null 2>&1 || true
update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
xdg-mime default enolink.desktop text/x-ink >/dev/null 2>&1 || true
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
echo "Tamam! Uygulama menüsünden 'Enolink!'i açabilir ya da terminalde 'enolink' yazabilirsin."
echo "Kaldırmak için: $HEDEF/kaldir.sh"
