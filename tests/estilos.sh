#!/bin/bash
# Prueba visual de las opciones de estilo (scripts/estilo.py): un still por variante, todo en UNA hoja.
# uso: bash tests/estilos.sh      -> out: proyectos/estilos-prueba/out/estilos/hoja.jpg (se mira esa sola imagen)
# Tomas y tiempos sintéticos (sin voz real). Tarda ~2 min.
set -euo pipefail
cd "$(dirname "$0")/.."
T=proyectos/estilos-prueba; rm -rf "$T"
scripts/nuevo_proyecto.sh Estilos Prueba >/dev/null 2>&1
for i in 0 1 2; do
  ffmpeg -nostdin -v error -y -f lavfi -i "testsrc2=s=1080x1920:r=30:d=3,hue=h=$((i*120))" -c:v libx264 -pix_fmt yuv420p "$T/raw/t$i.mp4"
done
printf '0.00\t1.20\tt0.mp4\t0\n1.20\t2.40\tt1.mp4\t0\n2.40\t5.00\tt2.mp4\t0\n' > "$T/edl.tsv"
echo "Pedí tu torta hoy y retirala mañana." > "$T/guion.txt"
python3 - "$T" <<'PY'
import json, sys
t = [(40, 310, 'Pedí'), (310, 470, 'tu'), (470, 860, 'torta'), (860, 1180, 'hoy'), (1180, 1230, 'y'), (1230, 1810, 'retirala'), (1810, 2340, 'mañana.')]
json.dump({'transcription': [{'offsets': {'from': a, 'to': b}, 'text': ' ' + w} for a, b, w in t]}, open(f'{sys.argv[1]}/audio/voz.json', 'w'))
PY
python3 - "$T" <<'PY'
from PIL import Image, ImageDraw, ImageFont
import sys
im = Image.new('RGBA', (600, 600), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.ellipse((10, 10, 590, 590), fill=(255, 255, 255, 255))
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 120)
d.text((300, 300), 'LOGO', font=f, fill=(225, 29, 72, 255), anchor='mm')
im.save(f'{sys.argv[1]}/reel/public/brand/logo.png')
PY
python3 -c "import json;p='$T/proyecto.json';d=json.load(open(p));d['duration']=5.0;d['voz']=False;json.dump(d,open(p,'w'))"
python3 scripts/make_words.py "$T" >/dev/null && python3 scripts/make_clips.py "$T" >/dev/null
(cd "$T/reel" && npm install --silent >/dev/null 2>&1 || true)
[ -d "$T/reel/node_modules" ] || ln -s /home/user/Editor-IA/template/reel/node_modules "$T/reel/node_modules"
OUT="$(pwd)/$T/out/estilos"; rm -rf "$OUT"; mkdir -p "$OUT"
CHROME_FLAG=(); [ -x /opt/pw-browsers/chromium ] && CHROME_FLAG=(--browser-executable /opt/pw-browsers/chromium)
N=0
variante() {   # nombre frame json-estilo
  N=$((N+1))
  python3 -c "import json,sys;p='$T/proyecto.json';d=json.load(open(p));d['estilo']=json.loads(sys.argv[1]);json.dump(d,open(p,'w'))" "$3"
  python3 scripts/make_words.py "$T" >/dev/null && python3 scripts/make_clips.py "$T" >/dev/null
  (cd "$T/reel" && npx remotion still src/index.jsx Reel "$OUT/raw.png" --frame="$2" "${CHROME_FLAG[@]}") > "$OUT/.log" 2>&1 || { tail -20 "$OUT/.log"; exit 1; }
  ffmpeg -nostdin -v error -y -i "$OUT/raw.png" -vf "scale=360:-1,drawbox=y=0:w=iw:h=34:color=black@0.8:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='$N $1':x=8:y=8:fontsize=18:fontcolor=white" "$OUT/$(printf %02d $N).png"
  echo "  $N $1"
}
scripts/sync_reel.sh "$T" >/dev/null
variante "palabra-dinamica" 40 '{}'
variante "grupo-abajo-contorno" 40 '{"subtitulos":{"modo":"grupo","posicion":"abajo","tipografias":"una","legibilidad":"contorno"}}'
variante "frase-medio-caja" 40 '{"subtitulos":{"modo":"frase","posicion":"medio","tipografias":"texto+destacados","legibilidad":"caja","destacar":["torta","mañana"]}}'
variante "karaoke-barra" 45 '{"subtitulos":{"modo":"karaoke","posicion":"abajo","tipografias":"una","legibilidad":"barra"}}'
variante "palabra-abajo-negro" 40 '{"subtitulos":{"posicion":"abajo","color":"negro","legibilidad":"caja","tipografias":"una"}}'
variante "look-calido-grano" 20 '{"look":"calido","grano":true}'
variante "look-bn" 20 '{"look":"bn"}'
variante "look-cine" 20 '{"look":"cine"}'
variante "look-vintage-sinvineta" 20 '{"look":"vintage","vineta":false,"grano":true}'
variante "cortina" 36 '{"transicion":{"tipo":"cortina"}}'
variante "fundido" 40 '{"transicion":{"tipo":"fundido"}}'
variante "entrada-titulo" 12 '{"entrada":{"tipo":"titulo","texto":"Tortas de feria"}}'
variante "entrada-logo" 6 '{"entrada":{"tipo":"logo"},"animacionLogo":"sello"}'
variante "cierre-cta" 118 '{"cierre":{"tipo":"cta","texto":"Pedí por DM"}}'
variante "cierre-congelada" 118 '{"cierre":{"tipo":"congelada"}}'
variante "zocalo-logoesquina" 60 '{"zocalo":{"texto":"Av. Siempreviva 742","start":1.5,"end":3},"logoEsquina":true}'
rm -f "$OUT/raw.png"
ffmpeg -nostdin -v error -y -framerate 1 -pattern_type glob -i "$OUT/[0-9]*.png" -vf "tile=4x4" -frames:v 1 -q:v 3 "$OUT/hoja.jpg"
echo "hoja: $OUT/hoja.jpg"
