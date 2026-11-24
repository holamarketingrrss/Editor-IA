#!/bin/bash
# Arma el reel en UN paso a partir de edl.tsv (o de las escenas de proyecto.json, para motion graphics): baja de Drive las tomas que falten en raw/ (según inventario.tsv),
# corre make_words (si hay voz), make_clips y el chequeo de zona segura; con --stills deja también la hoja de stills.
# uso: scripts/armar.sh <proyecto> [--stills]          salida corta: solo lo que hay que mirar o corregir
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1%/}"; STILLS=0; [ "${2:-}" = "--stills" ] && STILLS=1
ESCENAS=$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1])).get('escenas', [])))" "$P/proyecto.json" 2>/dev/null || echo 0)
[ -s "$P/edl.tsv" ] || [ "$ESCENAS" -gt 0 ] || { echo "falta $P/edl.tsv (o \"escenas\" en proyecto.json)"; exit 1; }
mkdir -p "$P/raw"
[ -s "$P/edl.tsv" ] && cut -f3 "$P/edl.tsv" | sort -u | while read -r f; do
  [ -z "$f" ] || [[ "$f" == escena:* ]] || [ -s "$P/raw/$f" ] && continue
  fila=$(awk -F'\t' -v t="$f" '$2==t' "$P/inventario.tsv" 2>/dev/null | head -1)
  [ -n "$fila" ] || { echo "FALTA la toma $f (no está en raw/ ni en inventario.tsv)"; exit 1; }
  id=$(cut -f3 <<<"$fila"); tam=$(cut -f4 <<<"$fila")
  scripts/drive_get.sh "$id" "$P/raw/$f" "$tam" < /dev/null >/dev/null || { echo "FALLÓ la descarga de $f"; exit 1; }
  echo "bajada: $f"
done
[ -f "$P/audio/voz.json" ] && python3 scripts/make_words.py "$P" | tail -1
python3 scripts/make_clips.py "$P" | tail -1
python3 -I scripts/zona_segura.py "$P" | grep -E "FUERA|SUPERPUESTO|CONTRASTE|OK:" | head -8 || true
if [ "$STILLS" = 1 ]; then scripts/stills.sh "$P" > "$P/.stills.log" 2>&1 || true; echo "hoja: $P/out/stills/hoja.jpg"; fi
