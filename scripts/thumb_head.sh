#!/bin/bash
# uso: thumb_head.sh <id> <outdir> -> baja solo los primeros 3 MB (un pedido) y saca un cuadro
id=$1; out=$2; url="https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
[ -s "$out/$id.jpg" ] && exit 0
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
curl -sS -r 0-3000000 -o "$tmp/head" --max-time 60 "$url" || { echo "FALLO $id"; exit 0; }
head -c 200 "$tmp/head" | grep -q "<!DOCTYPE" && { echo "CUPO $id"; exit 0; }
ffprobe -v error -select_streams v:0 -show_entries stream=width,height:stream_side_data=rotation:format=duration -of json "$tmp/head" > "$out/$id.json" 2>/dev/null
ffmpeg -v error -ss 0.6 -i "$tmp/head" -frames:v 1 -vf "scale=-2:240" -q:v 4 "$out/$id.jpg" -y 2>/dev/null \
  || ffmpeg -v error -i "$tmp/head" -frames:v 1 -vf "scale=-2:240" -q:v 4 "$out/$id.jpg" -y 2>/dev/null
[ -s "$out/$id.jpg" ] || echo "SINCUADRO $id"
