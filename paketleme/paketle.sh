#!/usr/bin/env bash
# Enolink! — paketleme betiği. Linux üzerinde hem Linux hem Windows paketlerini üretir.
# Gerekenler: node, npm, curl, unzip, zip, makensis (nsis paketi)
# Kullanım:   npm install && npm run paketle      → çıktılar dist/ klasörüne
set -euo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
PK="$KOK/paketleme"
SURUM=$(node -p "require('$KOK/package.json').version")
ELECTRON=33.4.11
DL="$PK/.indirilenler"; IS="$PK/.is"; CIKTI="$KOK/dist"
rm -rf "$IS" "$CIKTI"; mkdir -p "$DL" "$IS" "$CIKTI"

for p in linux-x64 win32-x64; do
  [ -f "$DL/electron-$p.zip" ] || curl -fL -o "$DL/electron-$p.zip" "https://github.com/electron/electron/releases/download/v$ELECTRON/electron-v$ELECTRON-$p.zip"
done
[ -x "$DL/appimagetool" ] || { curl -fL -o "$DL/appimagetool" https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage && chmod +x "$DL/appimagetool"; }

# --- Uygulama dosyaları (sadeleştirilmiş) ---
UYG="$IS/app"; NM="$KOK/node_modules"
mkdir -p "$UYG/node_modules/inkjs/dist" "$UYG/node_modules/codemirror/addon"
cp "$KOK"/{package.json,main.js,cekirdek.js,preload.js,LICENSE,LICENSE-ink.txt} "$UYG/"
cp -r "$KOK/renderer" "$KOK/unity" "$KOK/build" "$UYG/"
cp "$NM/inkjs/package.json" "$UYG/node_modules/inkjs/"
cp "$NM/inkjs/dist/ink-full.js" "$NM/inkjs/dist/ink.js" "$UYG/node_modules/inkjs/dist/"
cp "$NM/codemirror/package.json" "$NM/codemirror/LICENSE" "$UYG/node_modules/codemirror/"
cp -r "$NM/codemirror/lib" "$UYG/node_modules/codemirror/"
for d in mode dialog search edit selection; do cp -r "$NM/codemirror/addon/$d" "$UYG/node_modules/codemirror/addon/"; done
# package.json'dan geliştirme bağımlılıklarını çıkar
node -e "const f='$UYG/package.json';const p=require(f);delete p.devDependencies;delete p.scripts;require('fs').writeFileSync(f,JSON.stringify(p,null,2))"

# --- LINUX (CachyOS / Arch / diğerleri) ---
L="$IS/Enolink-linux-x64"
mkdir -p "$L"; (cd "$L" && unzip -q "$DL/electron-linux-x64.zip")
mv "$L/electron" "$L/enolink"; rm -f "$L/resources/default_app.asar"
cp -r "$UYG" "$L/resources/app"
cp "$KOK/build/icon.png" "$L/enolink.png"
cp "$PK"/linux/* "$L/"; chmod +x "$L/kur.sh" "$L/kaldir.sh" "$L/enolink.sh"
(cd "$IS" && tar -czf "$CIKTI/Enolink-$SURUM-linux-x64.tar.gz" "Enolink-linux-x64")

AD="$IS/AppDir"; cp -r "$L" "$AD"
printf '#!/bin/sh\nHERE="$(dirname "$(readlink -f "$0")")"\nexec "$HERE/enolink" --ozone-platform-hint=auto "$@"\n' > "$AD/AppRun"; chmod +x "$AD/AppRun"
sed -e 's|^Exec=.*|Exec=enolink %f|' -e 's|^Icon=.*|Icon=enolink|' "$PK/linux/enolink.desktop" > "$AD/enolink.desktop"
cp "$KOK/build/icon256.png" "$AD/enolink.png"
(cd "$IS" && ARCH=x86_64 "$DL/appimagetool" --appimage-extract-and-run --no-appstream "$AD" "$CIKTI/Enolink-$SURUM-x86_64.AppImage" >/dev/null 2>&1) || echo "UYARI: AppImage üretilemedi"

sed "s/@SURUM@/$SURUM/; s/@SHA@/$(sha256sum "$CIKTI/Enolink-$SURUM-linux-x64.tar.gz" | cut -d' ' -f1)/" "$PK/PKGBUILD.sablon" > "$CIKTI/PKGBUILD"

# --- WINDOWS 11 ---
W="$IS/Enolink-win-x64"
mkdir -p "$W"; (cd "$W" && unzip -q "$DL/electron-win32-x64.zip")
rm -f "$W/resources/default_app.asar"
cp -r "$UYG" "$W/resources/app"
node "$PK/exe-duzenle.js" "$W/electron.exe" "$W/Enolink.exe" "$KOK/build/icon.ico" "$SURUM"
rm "$W/electron.exe"
cp "$KOK/build/icon.ico" "$W/Enolink.ico"
cp "$PK/windows/OKUBENI.txt" "$W/"
(cd "$IS" && zip -qr -9 "$CIKTI/Enolink-$SURUM-win-x64-tasinabilir.zip" "Enolink-win-x64")
makensis -V2 -DSURUM="$SURUM" -DKAYNAK="$W" -DCIKTI="$CIKTI/Enolink-$SURUM-Kurulum.exe" -DIKON="$KOK/build/icon.ico" "$PK/windows/kurulum.nsi"

(cd "$CIKTI" && sha256sum Enolink-* > SHA256SUMS.txt)
ls -la "$CIKTI"
