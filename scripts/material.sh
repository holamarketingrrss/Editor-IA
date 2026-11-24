#!/bin/bash
# Material de una pieza en UN paso: miniaturas de cada video (de Drive o de raw/), hojas de contacto y catálogo.
# uso: scripts/material.sh <proyecto>
#   Lee inventario.tsv (carpeta<TAB>archivo<TAB>id de Drive<TAB>bytes, lo arma Claude con el conector de Drive);
#   si está vacío, usa los videos que ya estén en raw/. Salida corta: cuántos clips y qué hojas mirar.
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1%/}"; mkdir -p "$P/thumbs"
if [ ! -s "$P/inventario.tsv" ]; then   # material local: inventario desde raw/
  for f in "$P"/raw/*; do
    [ -f "$f" ] || continue
    printf 'raw\t%s\tlocal_%s\t%s\n' "$(basename "$f")" "$(basename "$f" | tr -c 'A-Za-z0-9._-' '_')" "$(wc -c < "$f")"
  done > "$P/inventario.tsv"
fi
[ -s "$P/inventario.tsv" ] || { echo "sin material: inventario.tsv vacío y raw/ vacío"; exit 1; }
LOG="$P/thumbs/.log"; : > "$LOG"
cuadro() {   # $1 id  $2 archivo  $3 proyecto
  local id=$1 tit=$2 P=$3 sz=${4:-0}
  if [ "${id#local_}" != "$id" ]; then
    [ -s "$P/thumbs/$id.jpg" ] && return 0
    ffprobe -v error -select_streams v:0 -show_entries stream=width,height:stream_side_data=rotation:format=duration -of json "$P/raw/$tit" > "$P/thumbs/$id.json" 2>/dev/null
    ffmpeg -v error -ss 0.6 -i "$P/raw/$tit" -frames:v 1 -vf "scale=-2:240" -q:v 4 "$P/thumbs/$id.jpg" -y 2>/dev/null || true
  else
    scripts/thumb_head.sh "$id" "$P/thumbs" "$sz"
  fi
}
n=0
while IFS=$'\t' read -r _ tit id sz; do   # de a 4 en paralelo (más, y Drive corta por cupo)
  cuadro "$id" "$tit" "$P" "$sz" < /dev/null >> "$LOG" 2>&1 &   # </dev/null: ffmpeg no se come el inventario
  n=$((n+1)); [ $((n % 4)) = 0 ] && wait
done < "$P/inventario.tsv"
wait
N=$(python3 -I scripts/contact.py "$P" | cut -d' ' -f1)
FALLAS=$(grep -c -E "FALLO|CUPO|SINCUADRO" "$LOG" || true)
echo "$N clips con miniatura ($FALLAS sin cuadro). Catálogo: $P/catalogo.tsv · hojas: $(ls "$P"/sheets/sheet_*.jpg | tr '\n' ' ')"
