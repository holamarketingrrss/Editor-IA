#!/bin/bash
# Prueba de humo del flujo, sin renderizar: nuevo_proyecto -> make_words -> make_clips -> zona_segura (datos sintéticos).
# uso: bash tests/smoke.sh        (crea y borra proyectos/smoke-prueba)
set -euo pipefail
cd "$(dirname "$0")/.."
T=proyectos/smoke-prueba; rm -rf "$T"; trap 'rm -rf "$T"' EXIT
fallo() { echo "FALLÓ: $1"; exit 1; }
scripts/nuevo_proyecto.sh Smoke Prueba >/dev/null 2>&1
ffmpeg -nostdin -v error -f lavfi -i "color=c=0x303030:s=1080x1920:r=30:d=8" -c:v libx264 -pix_fmt yuv420p "$T/raw/t.mp4" -y
printf '0.00\t4.00\tt.mp4\t0\n4.00\t8.00\tt.mp4\t1\n' > "$T/edl.tsv"
python3 - "$T" <<'PY'
import json, sys
T = sys.argv[1]
tiempos = [(0.1, 0.5), (0.5, 0.9), (0.9, 1.4), (1.4, 2.0), (2.0, 2.6), (2.6, 3.1)]
json.dump({'transcription': [{'offsets': {'from': int(a * 1000), 'to': int(b * 1000)}, 'text': ' palabra%d' % i} for i, (a, b) in enumerate(tiempos)]},
          open(f'{T}/audio/voz.json', 'w'))
PY
python3 scripts/make_words.py "$T" >/dev/null
python3 scripts/make_clips.py "$T" >/dev/null
python3 - "$T" <<'PY' || fallo "los tiempos o la cantidad de palabras no coinciden con voz.json"
import json, sys
T = sys.argv[1]; w = json.load(open(f'{T}/words.json')); d = json.load(open(f'{T}/reel/src/data.json'))
assert len(w) == 6, len(w)
assert [x['start'] for x in w] == [0.1, 0.5, 0.9, 1.4, 2.0, 2.6], [x['start'] for x in w]
assert all(220 <= x['y'] <= 1500 for x in w)
assert (d['duration'], d['outroAt']) == (8.0, 6.06), (d['duration'], d['outroAt'])
assert len(d['clips']) == 2
PY
python3 scripts/zona_segura.py "$T" >/dev/null || fallo "zona_segura marca fuera de zona en datos válidos"
# un sticker fuera de zona tiene que ser detectado
python3 - "$T" <<'PY'
import json, sys
p = f'{sys.argv[1]}/reel/src/data.json'; d = json.load(open(p))
d['stickers'] = [dict(img='x.png', start=1, end=2, x=500, y=60, w=200, rot=0, white=False)]; json.dump(d, open(p, 'w'))
PY
if python3 scripts/zona_segura.py "$T" >/dev/null; then fallo "no detectó un sticker en los 220 px de arriba"; fi
python3 scripts/zona_segura.py "$T" --frames >/dev/null || fallo "--frames"
# motion graphics: una escena en lugar de una toma (edl "escena:<id>") y un video solo de escenas (sin edl.tsv)
python3 - "$T" <<'PY'
import json, sys
p = f'{sys.argv[1]}/proyecto.json'
try: c = json.load(open(p))
except Exception: c = {}
c['escenas'] = [{'id': 'dato', 'tipo': 'numero', 'numero': 50, 'sufijo': '%', 'dur': 2},
                {'id': 'fin', 'tipo': 'titulo', 'texto': 'Hola *mundo*', 'dur': 3}]
json.dump(c, open(p, 'w'))
PY
printf '0.00\t4.00\tt.mp4\t0\n4.00\t6.00\tescena:dato\t0\n' > "$T/edl.tsv"
python3 scripts/make_clips.py "$T" >/dev/null || fallo "make_clips con una escena en el EDL"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); c=d['clips']; assert c[1]['tipo']=='escena' and c[1]['escena']['numero']==50, c" "$T/reel/src/data.json" || fallo "la escena del EDL no llegó a data.json"
rm "$T/edl.tsv"
python3 scripts/make_clips.py "$T" >/dev/null || fallo "make_clips solo con escenas"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); assert [c['start'] for c in d['clips']]==[0,2] and (d['outroAt'], d['duration'])==(5.0, 6.94), (d['outroAt'], d['duration'])" "$T/reel/src/data.json" || fallo "tiempos del video solo de escenas"
python3 scripts/zona_segura.py "$T" --frames | grep -q escena-fin || fallo "--frames no incluye las escenas"
[ -f "$T/reel/src/ilustraciones.jsx" ] || fallo "el proyecto nuevo no trae reel/src/ilustraciones.jsx"
echo "OK: flujo nuevo_proyecto -> make_words -> make_clips -> zona_segura (y escenas de motion graphics)"
