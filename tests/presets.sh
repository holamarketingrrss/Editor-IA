#!/bin/bash
# Prueba visual de los presets de marca: un reel corto por preset (tomas sintéticas, tiempos de voz sintéticos)
# y UNA hoja con 5 frames de cada uno (subtítulo, sticker y flecha a mitad de animación, flecha + emoji, cierre).
# uso: bash tests/presets.sh [marca ...]     (sin argumentos: todos los de presets/)  -> out: proyectos/presets-prueba.jpg
set -euo pipefail
cd "$(dirname "$0")/.."
MARCAS=("$@"); [ ${#MARCAS[@]} -gt 0 ] || MARCAS=($(ls presets))
CHROME_FLAG=(); [ -x /opt/pw-browsers/chromium ] && CHROME_FLAG=(--browser-executable /opt/pw-browsers/chromium)
HOJAS=()
for M in "${MARCAS[@]}"; do
  T=proyectos/$M-prueba-preset; rm -rf "$T"
  scripts/nuevo_proyecto.sh "$M" prueba-preset --preset "$M" >/dev/null
  python3 - "$T" <<'PY'
import json, subprocess, sys
T = sys.argv[1]
b = json.load(open(f'{T}/reel/src/brand.json')); C = list(b['colores'].values())
for i in range(3):   # tomas: degradés con colores de la marca (para ver contraste y looks)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i',
        f"gradients=s=1080x1920:r=30:d=3:c0={C[(i*2+1) % len(C)]}:c1={C[(i*2+3) % len(C)]}:speed=0.02", '-pix_fmt', 'yuv420p', f'{T}/raw/t{i}.mp4'], check=True)
open(f'{T}/edl.tsv', 'w').write('0.00\t1.60\tt0.mp4\t0\n1.60\t3.20\tt1.mp4\t0\n3.20\t6.00\tt2.mp4\t0\n')
frase = {'lujis': 'Hello friend! Come visit us and taste the difference', 'pausa': 'Regalate un momento de pausa en tu día'}.get(b['nombre'].lower(), 'Esta es una frase de prueba para la marca')
w = frase.split(); dur = 3.4 / len(w)
json.dump({'transcription': [{'offsets': {'from': int(i * dur * 1000), 'to': int((i + 1) * dur * 1000)}, 'text': ' ' + x} for i, x in enumerate(w)]},
          open(f'{T}/audio/voz.json', 'w'))
p = json.load(open(f'{T}/proyecto.json')); p.update(duration=6.0, voz=False)
brand_dir = f'{T}/reel/public/brand'; import os
stk = [f for f in sorted(os.listdir(brand_dir)) if f != b['logo'] and not f.startswith(('pausa-', 'luji-'))]
if stk:
    p['stickers'] = [dict(img=stk[0], start=0.8, end=2.6, x=820, y=520, w=230, rot=12, white=True)]
p['graficos'] = [dict(tipo='flecha', forma='curva', start=1.0, end=3.0, x=330, y=1180, w=240, rot=-10, color=b['acentos'][0]),
                 dict(tipo='emoji', emoji='🔥', start=2.0, end=3.6, x=800, y=1260, size=150, rot=8)]
json.dump(p, open(f'{T}/proyecto.json', 'w'), ensure_ascii=False, indent=1)
PY
  python3 scripts/make_words.py "$T" >/dev/null; python3 scripts/make_clips.py "$T" >/dev/null
  [ -d "$T/reel/node_modules" ] || ln -s "$(pwd)/template/reel/node_modules" "$T/reel/node_modules"
  OUT="$(pwd)/$T/out/preset"; mkdir -p "$OUT"; N=0
  for F in 15 28 36 75 140; do
    N=$((N+1))
    (cd "$T/reel" && npx remotion still src/index.jsx Reel "$OUT/f$N.png" --frame=$F "${CHROME_FLAG[@]}") > "$OUT/.log" 2>&1 || { tail -15 "$OUT/.log"; exit 1; }
  done
  ffmpeg -nostdin -v error -y -i "$OUT/f1.png" -i "$OUT/f2.png" -i "$OUT/f3.png" -i "$OUT/f4.png" -i "$OUT/f5.png" -filter_complex \
    "[0][1][2][3][4]hstack=inputs=5,scale=1600:-1,drawbox=y=0:w=iw:h=40:color=black@0.75:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='$M':x=12:y=8:fontsize=24:fontcolor=white" "$OUT/fila.png"
  HOJAS+=("-i" "$OUT/fila.png"); echo "  $M ok"
done
if [ ${#MARCAS[@]} -gt 1 ]; then ffmpeg -nostdin -v error -y "${HOJAS[@]}" -filter_complex "vstack=inputs=${#MARCAS[@]}" proyectos/presets-prueba.jpg
else ffmpeg -nostdin -v error -y "${HOJAS[@]}" proyectos/presets-prueba.jpg; fi
echo "hoja: proyectos/presets-prueba.jpg"
