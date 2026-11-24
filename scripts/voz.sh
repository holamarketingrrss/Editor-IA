#!/usr/bin/env bash
# Voz del reel: guion.txt -> (ElevenLabs) -> audio/voz.mp3 -> whisper.cpp -> audio/voz.json
# uso:
#   scripts/voz.sh <proyecto> --texto          imprime el texto a mandar a ElevenLabs (de guion.txt)
#   scripts/voz.sh <proyecto> --url <mp3>      baja el MP3 que devolvió creative_generate_speech y transcribe
#   scripts/voz.sh <proyecto> --mp3 <archivo>  usa un MP3 local (locución grabada) y transcribe
#   scripts/voz.sh <proyecto>                  re-transcribe el audio/voz.mp3 que ya está
# ElevenLabs va por el conector (eleven_v4, voz argentina): no hay API key en el sandbox, por eso
# la generación la hace Claude con el texto de --texto y este script toma la URL resultante.
# guion.txt: el texto de la locución; puede llevar etiquetas de v4 como [entusiasmada], que no se cuentan.
set -euo pipefail
P=${1:?uso: scripts/voz.sh <proyecto> [--texto | --url <mp3> | --mp3 <archivo>]}
P=${P%/}; shift
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
WH=$RAIZ/tools/whisper.cpp
MODELO=$WH/models/ggml-small.bin
mkdir -p "$P/audio"

texto() {   # guion.txt, o las palabras de guion.json si no hay txt
  if [ -f "$P/guion.txt" ]; then cat "$P/guion.txt"
  elif [ -f "$P/guion.json" ]; then python3 -c 'import json,sys;print(" ".join(g["text"] for g in json.load(open(sys.argv[1])) if g.get("text")))' "$P/guion.json"
  fi
}

case "${1:-}" in
  --texto) t=$(texto); [ -n "$t" ] || { echo "falta $P/guion.txt" >&2; exit 1; }; echo "$t"; exit 0 ;;
  --url)  curl -fsS -o "$P/audio/voz.mp3" "${2:?falta la URL}" ;;
  --mp3)  cp "${2:?falta el archivo}" "$P/audio/voz.mp3" ;;
  "")     ;;
  *)      echo "opción desconocida: $1" >&2; exit 1 ;;
esac
[ -s "$P/audio/voz.mp3" ] || { echo "no hay $P/audio/voz.mp3" >&2; exit 1; }
[ -f "$MODELO" ] || { echo "falta el modelo de whisper: corré bash scripts/instalar.sh" >&2; exit 1; }

LOG=$P/audio/whisper.log
ffmpeg -y -v error -i "$P/audio/voz.mp3" -ar 16000 -ac 1 -c:a pcm_s16le "$P/audio/voz16k.wav"
"$WH/build/bin/whisper-cli" -m "$MODELO" -l es -ml 1 -sow -ojf -of "$P/audio/voz" -f "$P/audio/voz16k.wav" >"$LOG" 2>&1 \
  || { tail -5 "$LOG"; exit 1; }
rm -f "$P/audio/voz16k.wav"

# alinea con el guion (Whisper a veces parte "retirala" en "retira la": se fusionan) y resume
python3 - "$P" "$(texto)" <<'EOF'
import json, re, sys, unicodedata
P, guion = sys.argv[1], sys.argv[2]
d = json.load(open(f'{P}/audio/voz.json'))
tr = [s for s in d['transcription'] if s['text'].strip()]
norm = lambda s: re.sub(r'[\W_]', '', unicodedata.normalize('NFC', s).lower())
g = re.sub(r'\[[^\]]*\]', ' ', guion).split()
nota = ''
if g and len(g) != len(tr):
    nuevo, j, ok = [], 0, True
    for w in g:
        if j >= len(tr): ok = False; break
        k, acc = j, ''
        while k < len(tr) and len(acc) < len(norm(w)):
            acc += norm(tr[k]['text']); k += 1
        if acc != norm(w): ok = False; break
        s = dict(tr[j]); s['offsets'] = {'from': tr[j]['offsets']['from'], 'to': tr[k - 1]['offsets']['to']}
        s['text'] = ' ' + ' '.join(t['text'].strip() for t in tr[j:k]).replace(' ', '') if k - j > 1 else tr[j]['text']
        nuevo.append(s); j = k
    if ok and j == len(tr):
        json.dump(d, open(f'{P}/audio/voz.whisper.json', 'w'), ensure_ascii=False)
        d['transcription'] = nuevo; tr = nuevo
        json.dump(d, open(f'{P}/audio/voz.json', 'w'), ensure_ascii=False, indent=1)
        nota = ' (alineado con el guion; original en voz.whisper.json)'
pal = [s['text'].strip() for s in tr]
dur = tr[-1]['offsets']['to'] / 1000 if tr else 0
print(f'voz.json: {len(pal)} palabras, {dur:.2f} s{nota}')
print('whisper:', ' '.join(pal))
print('tiempos:', ' · '.join(f"{p} {s['offsets']['from'] / 1000:.2f}" for p, s in zip(pal, tr)))   # para armar el EDL sin abrir voz.json
if g:
    print('guion:  ', ' '.join(g))
    if len(g) != len(pal):
        print(f'AVISO: el guion tiene {len(g)} palabras y Whisper {len(pal)}: revisá antes de make_words.py')
EOF
