#!/bin/bash
# Reel de persona a cámara: la voz sale de las tomas del EDL (no de ElevenLabs).
# uso: scripts/voz_tomas.sh <proyecto> [--sin-limpiar]
# Junta el audio de cada toma del edl.tsv (mismo corte que el video), lo limpia (filtro de graves, reducción de ruido,
# compresión suave) y lo deja como audio/voz.mp3; después corre voz.sh (whisper) para los subtítulos y fija en
# proyecto.json voiceOffset 0 y el audio original muteado (la voz ya va en voz.mp3). Si hay guion.txt, alinea con él.
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1%/}"; LIMPIAR=1; [ "${2:-}" = "--sin-limpiar" ] && LIMPIAR=0
[ -s "$P/edl.tsv" ] || { echo "falta $P/edl.tsv"; exit 1; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT; n=0
while IFS=$'\t' read -r a b f inp _; do
  [ -n "$f" ] || continue
  dur=$(python3 -c "print(round($b - $a, 3))")
  ffmpeg -nostdin -v error -y -ss "$inp" -t "$dur" -i "$P/raw/$f" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$T/$(printf %03d $n).wav" < /dev/null
  n=$((n+1))
done < "$P/edl.tsv"
for w in "$T"/*.wav; do echo "file '$w'"; done > "$T/lista.txt"
FILTRO="anull"
[ "$LIMPIAR" = 1 ] && FILTRO="highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=10:release=200,alimiter=limit=0.95"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$T/lista.txt" -af "$FILTRO" -ac 2 -c:a libmp3lame -q:a 2 "$P/audio/voz.mp3"
python3 - "$P/proyecto.json" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d['voiceOffset'] = 0; d.setdefault('estilo', {})['audioOriginal'] = 'mute'; d.pop('voz', None)
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
PY
echo "voz armada desde $n tomas$([ "$LIMPIAR" = 1 ] && echo ' (limpia)')"
scripts/voz.sh "$P"
