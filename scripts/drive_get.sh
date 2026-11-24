#!/bin/bash
# uso: drive_get.sh <id> <salida> <tamaño_bytes> -> baja en partes de 16 MB (evita el cupo de descarga completa)
id=$1; out=$2; size=$3; url="https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
[ -f "$out" ] && [ "$(stat -c%s "$out")" = "$size" ] && exit 0
: > "$out.part"; step=16000000; s=0
while [ $s -lt $size ]; do
  e=$((s+step-1)); [ $e -ge $size ] && e=$((size-1))
  for t in 1 2 3; do curl -sS -r $s-$e -o "$out.chunk" --max-time 120 "$url" && [ "$(stat -c%s "$out.chunk")" = "$((e-s+1))" ] && break; sleep $((t*3)); done
  [ "$(stat -c%s "$out.chunk")" = "$((e-s+1))" ] || { echo "FALLO $id en $s"; rm -f "$out.chunk"; exit 1; }
  cat "$out.chunk" >> "$out.part"; s=$((e+1))
done
rm -f "$out.chunk"; mv "$out.part" "$out"; echo "OK $(basename "$out")"
