#!/bin/bash
# Reel de persona a cámara: la voz sale de las tomas del EDL (no de ElevenLabs).
# uso: scripts/voz_tomas.sh <proyecto> [--sin-limpiar] [--sin-ajustar]
# Primero ajusta los cortes del EDL a la voz (scripts/cortes_finos.py: sin aire ni respiraciones antes y después de cada
# frase; --sin-ajustar lo saltea). Junta el audio de cada toma del edl.tsv (mismo corte que el video), lo limpia según
# estilo.audio (natural: graves, ruido y compresión suave; podcast: además de-esser, compresión y EQ de locución) y lo deja como audio/voz.mp3; después corre voz.sh (whisper) para los subtítulos y fija en
# proyecto.json voiceOffset 0 y el audio original muteado (la voz ya va en voz.mp3). Si hay guion.txt, alinea con él.
set -euo pipefail
cd "$(dirname "$0")/.."
P="${1%/}"; LIMPIAR=1; AJUSTAR=1
for o in "${@:2}"; do case "$o" in --sin-limpiar) LIMPIAR=0;; --sin-ajustar) AJUSTAR=0;; esac; done
[ -s "$P/edl.tsv" ] || { echo "falta $P/edl.tsv"; exit 1; }
[ "$AJUSTAR" = 1 ] && python3 scripts/cortes_finos.py "$P" | tail -1
AUDIO=$(python3 -c "import json,sys; print(json.loads(sys.stdin.read()).get('audio', 'natural'))" < <(python3 scripts/estilo.py "$P"))
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT; n=0
while IFS=$'\t' read -r a b f inp _; do
  [ -n "$f" ] || continue
  [[ "$f" == escena:* ]] && { ffmpeg -nostdin -v error -y -f lavfi -i anullsrc=r=48000:cl=mono -t "$(python3 -c "print(round($b - $a, 3))")" -c:a pcm_s16le "$T/$(printf %03d $n).wav" < /dev/null; n=$((n+1)); continue; }
  dur=$(python3 -c "print(round($b - $a, 3))")
  ffmpeg -nostdin -v error -y -ss "$inp" -t "$dur" -i "$P/raw/$f" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$T/$(printf %03d $n).wav" < /dev/null
  n=$((n+1))
done < "$P/edl.tsv"
for w in "$T"/*.wav; do echo "file '$w'"; done > "$T/lista.txt"
FILTRO="anull"
[ "$LIMPIAR" = 1 ] && FILTRO="highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=10:release=200,alimiter=limit=0.95"
# podcast: la cadena del reel de HM (graves, ruido, de-esser, compresión y EQ de locución); las respiraciones bajan con un expansor suave
[ "$LIMPIAR" = 1 ] && [ "$AUDIO" = podcast ] && FILTRO="highpass=f=80,afftdn=nr=12:nf=-44:tn=1,agate=threshold=0.012:ratio=2:attack=4:release=140:range=0.4,deesser=i=0.5:m=0.5:f=0.5,acompressor=threshold=-24dB:ratio=4:attack=5:release=90:makeup=4,equalizer=f=120:t=h:w=0.7:g=2.5,equalizer=f=320:t=q:w=1.2:g=-2.5,equalizer=f=3500:t=q:w=1.4:g=3,equalizer=f=10000:t=h:w=0.7:g=2,alimiter=limit=0.89"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$T/lista.txt" -af "$FILTRO" -ac 2 -c:a libmp3lame -q:a 2 "$P/audio/voz.mp3"
python3 - "$P/proyecto.json" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d['voiceOffset'] = 0; d.setdefault('estilo', {})['audioOriginal'] = 'mute'; d.pop('voz', None)
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
PY
echo "voz armada desde $n tomas$([ "$LIMPIAR" = 1 ] && echo " (limpia: $AUDIO)")"
scripts/voz.sh "$P"
