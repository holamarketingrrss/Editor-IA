#!/bin/bash
# uso: thumb.sh <id> <outdir>  -> escribe <id>.jpg y <id>.json (duración, tamaño, rotación). Reintenta si Drive limita.
id=$1; out=$2; url="https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
[ -s "$out/$id.jpg" ] && exit 0
for try in 1 2 3 4; do
  ffprobe -v error -rw_timeout 30000000 -select_streams v:0 -show_entries stream=width,height:stream_side_data=rotation:format=duration -of json "$url" > "$out/$id.json" 2>/dev/null
  d=$(jq -r '.format.duration // empty' "$out/$id.json" 2>/dev/null)
  if [ -n "$d" ]; then
    ss=$(echo "$d" | awk '{printf "%.2f", $1*0.45}')
    timeout 90 ffmpeg -v error -rw_timeout 30000000 -ss "$ss" -i "$url" -frames:v 1 -vf "scale=-2:240" -q:v 4 "$out/$id.jpg" -y 2>/dev/null && [ -s "$out/$id.jpg" ] && exit 0
  fi
  sleep $((try * 5))
done
echo "FALLO $id"
