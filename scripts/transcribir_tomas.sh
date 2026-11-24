#!/bin/bash
# Transcribe cada video de raw/ en frases con tiempos, para elegir tomas leyendo texto (barato) en vez de imágenes.
# uso: scripts/transcribir_tomas.sh <proyecto>      -> <proyecto>/tomas.txt (y lo imprime); baja de Drive lo que falte
# Formato: "archivo [inicio-fin] texto", una frase por línea. Sirve para reels de persona a cámara: ver qué dice
# cada toma, descartar repeticiones y armar el EDL cortando entre frases.
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1%/}"; WH=tools/whisper.cpp; MODELO=$WH/models/ggml-small.bin
mkdir -p "$P/audio/tomas"; : > "$P/tomas.txt"
# las tomas del inventario que falten en raw/ se bajan completas (para transcribir hace falta todo el audio)
if [ -s "$P/inventario.tsv" ]; then
  while IFS=$'\t' read -r _ tit id sz; do
    [ -s "$P/raw/$tit" ] || [ "${id#local_}" != "$id" ] || scripts/drive_get.sh "$id" "$P/raw/$tit" "$sz" < /dev/null > /dev/null \
      || echo "FALLÓ la descarga de $tit"
  done < "$P/inventario.tsv"
fi
for f in "$P"/raw/*; do
  [ -f "$f" ] || continue
  b=$(basename "$f"); base="$P/audio/tomas/${b%.*}"
  if [ ! -s "$base.json" ]; then
    ffmpeg -nostdin -v error -y -i "$f" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$base.wav" < /dev/null
    "$WH/build/bin/whisper-cli" -m "$MODELO" -l es -oj -of "$base" -f "$base.wav" > "$base.log" 2>&1 || { tail -3 "$base.log"; exit 1; }
    rm -f "$base.wav"
  fi
  python3 -I - "$base.json" "$b" >> "$P/tomas.txt" <<'PY'
import json, sys
for s in json.load(open(sys.argv[1]))['transcription']:
    t = s['text'].strip()
    if t and not t.startswith('['):
        print(f"{sys.argv[2]} [{s['offsets']['from'] / 1000:.1f}-{s['offsets']['to'] / 1000:.1f}] {t}")
PY
done
cat "$P/tomas.txt"
