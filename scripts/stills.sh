#!/bin/bash
# Stills de las palabras clave, stickers y cierre, juntos en UNA hoja de contactos, para revisar antes del render completo.
# uso: scripts/stills.sh proyectos/<cliente>-<tema> [--max N]      (N = cantidad de frames, por defecto 8)
# Salida: <proyecto>/out/stills/hoja.jpg (mirá esa sola imagen) + un png por frame. Incluye el chequeo de zona segura y contraste.
# Revisá: contraste, que ningún texto tape caras, y que nada quede en los 220 px de arriba ni los 420 px de abajo.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -ge 1 ] || { sed -n '2,5p' "$0"; exit 1; }
P="${1%/}"; shift
MAX=8
while [ $# -gt 0 ]; do case "$1" in --max) MAX="$2"; shift 2;; *) echo "opción desconocida: $1"; exit 1;; esac; done
[ -f "$P/reel/src/data.json" ] || { echo "falta $P/reel/src/data.json: corré scripts/make_clips.py primero"; exit 1; }

RC=0; python3 -I scripts/zona_segura.py "$P" || RC=$?
OUT="$(pwd)/$P/out/stills"; rm -rf "$OUT"; mkdir -p "$OUT"
[ -d "$P/reel/node_modules" ] || (cd "$P/reel" && npm install --silent)
CHROME_FLAG=(); [ -x /opt/pw-browsers/chromium ] && CHROME_FLAG=(--browser-executable /opt/pw-browsers/chromium)
echo; echo "Renderizando stills ..."
N=0
while IFS=$'\t' read -r FRAME NOMBRE; do
  N=$((N+1)); ARCH=$(printf "%02d_f%04d_%s.png" "$N" "$FRAME" "$NOMBRE")
  (cd "$P/reel" && npx remotion still src/index.jsx Reel "$OUT/$ARCH" --frame="$FRAME" "${CHROME_FLAG[@]}") > "$OUT/.log" 2>&1 \
    || { tail -15 "$OUT/.log"; echo "FALLÓ el still del frame $FRAME"; exit 1; }
  echo "  $ARCH"
done < <(python3 -I scripts/zona_segura.py "$P" --frames --max "$MAX")
COLS=4; [ "$N" -lt 4 ] && COLS="$N"; FILAS=$(( (N + COLS - 1) / COLS ))
ffmpeg -nostdin -v error -y -framerate 1 -pattern_type glob -i "$OUT/*.png" -vf "scale=360:-1,tile=${COLS}x${FILAS}" -frames:v 1 -q:v 3 "$OUT/hoja.jpg"
echo; echo "Hoja de contactos (orden = lista de arriba, de izquierda a derecha): $OUT/hoja.jpg"
exit $RC
