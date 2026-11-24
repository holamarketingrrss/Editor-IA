#!/bin/bash
# uso: thumb_head.sh <id> <outdir> [bytes] -> saca un cuadro bajando solo el principio del video (3 MB)
# Si el video guarda el índice al final (cámaras Sony XAVC, etc.) y se pasa el tamaño, baja también los últimos 8 MB
# y arma un archivo con huecos del tamaño real: ffmpeg encuentra el índice y el primer cuadro sin bajar todo.
id=$1; out=$2; size=${3:-0}; url="https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
[ -s "$out/$id.jpg" ] && exit 0
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
curl -sS -r 0-3000000 -o "$tmp/head" --max-time 60 "$url" || { echo "FALLO $id"; exit 0; }
head -c 200 "$tmp/head" | grep -q "<!DOCTYPE" && { echo "CUPO $id"; exit 0; }
cuadro() {
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height:stream_side_data=rotation:format=duration -of json "$1" > "$out/$id.json" 2>/dev/null
  ffmpeg -nostdin -v error -ss 0.6 -i "$1" -frames:v 1 -vf "scale=-2:240" -q:v 4 "$out/$id.jpg" -y 2>/dev/null
  [ -s "$out/$id.jpg" ] || ffmpeg -nostdin -v error -i "$1" -frames:v 1 -vf "scale=-2:240" -q:v 4 "$out/$id.jpg" -y 2>/dev/null
}
cuadro "$tmp/head"
if [ ! -s "$out/$id.jpg" ] && [ "$size" -gt 12000000 ]; then
  curl -sS -r $((size - 8000000))-$((size - 1)) -o "$tmp/tail" --max-time 90 "$url" || { echo "FALLO $id (final)"; exit 0; }
  truncate -s "$size" "$tmp/full"
  dd if="$tmp/head" of="$tmp/full" conv=notrunc status=none
  dd if="$tmp/tail" of="$tmp/full" bs=1M seek=$((size - 8000000)) oflag=seek_bytes conv=notrunc status=none
  cuadro "$tmp/full"
fi
[ -s "$out/$id.jpg" ] || echo "SINCUADRO $id"
