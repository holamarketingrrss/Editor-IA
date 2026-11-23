#!/bin/bash
# Renderiza el reel de un proyecto: Remotion -> loudnorm en 2 pasadas (-14 LUFS / -1,5 dBTP) -> MARCA_Tema_Formato_vN.mp4
# uso: scripts/render.sh proyectos/<cliente>-<tema> [--marca MARCA] [--tema Tema] [--formato Reel] [--version N]
# Salida: <proyecto>/out/MARCA_Tema_Formato_vN.mp4 (H.264, 1080x1920, 30 fps, AAC) y un chequeo de los defaults de entrega.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -ge 1 ] || { sed -n '2,4p' "$0"; exit 1; }
P="${1%/}"; shift
MARCA=""; TEMA=""; FORMATO="Reel"; VERSION=""
while [ $# -gt 0 ]; do
  case "$1" in
    --marca) MARCA="$2";; --tema) TEMA="$2";; --formato) FORMATO="$2";; --version) VERSION="$2";;
    *) echo "opción desconocida: $1"; exit 1;;
  esac
  shift 2
done
[ -f "$P/reel/src/data.json" ] || { echo "falta $P/reel/src/data.json: corré scripts/make_clips.py primero"; exit 1; }

limpiar() { echo "$1" | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null | tr -cd 'A-Za-z0-9'; }
[ -n "$MARCA" ] || MARCA=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['nombre'])" "$P/reel/src/brand.json")
MARCA=$(limpiar "$MARCA" | tr 'a-z' 'A-Z')
[ -n "$TEMA" ] || TEMA=$(python3 -I -c "import sys;r=sys.argv[1].split('/')[-1].split('-',1)[-1];print(''.join(w.capitalize() for w in r.split('-')))" "$P")
TEMA=$(limpiar "$TEMA"); FORMATO=$(limpiar "$FORMATO")
OUT="$(pwd)/$P/out"; mkdir -p "$OUT"
if [ -z "$VERSION" ]; then VERSION=1; while [ -e "$OUT/${MARCA}_${TEMA}_${FORMATO}_v$VERSION.mp4" ]; do VERSION=$((VERSION+1)); done; fi
FINAL="$OUT/${MARCA}_${TEMA}_${FORMATO}_v$VERSION.mp4"; CRUDO="$OUT/.crudo.mp4"

# 1) Render con Remotion
[ -d "$P/reel/node_modules" ] || (cd "$P/reel" && npm install --silent)
CHROME_FLAG=(); [ -x /opt/pw-browsers/chromium ] && CHROME_FLAG=(--browser-executable /opt/pw-browsers/chromium)
echo "Renderizando $P ..."
(cd "$P/reel" && npx remotion render src/index.jsx Reel "$CRUDO" --codec h264 --pixel-format yuv420p --crf 16 \
   --audio-codec aac "${CHROME_FLAG[@]}") > "$OUT/render.log" 2>&1 || { tail -25 "$OUT/render.log"; echo "FALLÓ el render (log: $OUT/render.log)"; exit 1; }

# 2) Audio a -14 LUFS / -1,5 dBTP (loudnorm en 2 pasadas: mide y aplica)
if [ -z "$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$CRUDO")" ]; then
  echo "AVISO: el render no tiene audio (¿falta voz.mp3?); se entrega sin normalizar."
  ffmpeg -nostdin -v error -y -i "$CRUDO" -c copy -movflags +faststart "$FINAL"
else
  FILTRO=$(ffmpeg -nostdin -hide_banner -i "$CRUDO" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -I -c "
import json,sys
t=sys.stdin.read(); m=json.loads(t[t.rindex('{'):t.rindex('}')+1])
print('loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true' % (m['input_i'],m['input_tp'],m['input_lra'],m['input_thresh'],m['target_offset']))")
  ffmpeg -nostdin -v error -y -i "$CRUDO" -af "$FILTRO" -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$FINAL"
fi
rm -f "$CRUDO"

# 3) Chequeo de los defaults de entrega
python3 -I - "$FINAL" <<'PY'
import json, subprocess, sys
f = sys.argv[1]
v = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=codec_name,width,height,r_frame_rate,duration', '-of', 'json', f]))['streams'][0]
num, den = map(int, v['r_frame_rate'].split('/')); fps = num / den
r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', f, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-'],
    capture_output=True, text=True).stderr
try:
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1]); lufs, tp = float(m['input_i']), float(m['input_tp'])
except Exception:
    lufs = tp = None
mb = subprocess.check_output(['stat', '-c%s', f]).decode().strip()
chk = [('H.264', v['codec_name'] == 'h264'), ('1080x1920', (v['width'], v['height']) == (1080, 1920)), ('30 fps', abs(fps - 30) < .01),
       ('-14 LUFS (±1)', lufs is not None and abs(lufs + 14) <= 1), ('pico ≤ -1,0 dBTP', tp is not None and tp <= -1.0)]
print(f"\n{f}\n  {float(v['duration']):.2f} s · {int(mb)/1e6:.1f} MB · {v['codec_name']} {v['width']}x{v['height']} {fps:g} fps"
      + (f" · {lufs:.1f} LUFS · {tp:.1f} dBTP" if lufs is not None else ' · sin audio'))
mal = [n for n, ok in chk if not ok]
print('  ' + ('OK: cumple los defaults de entrega.' if not mal else 'REVISAR, no cumple: ' + ', '.join(mal)))
sys.exit(1 if mal else 0)
PY
echo "Entrega: mandalo por el chat (SendUserFile) y subilo a Editor IA › Resultados Finales."
