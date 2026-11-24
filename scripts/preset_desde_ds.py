#!/usr/bin/env python3
# Arma presets/<marca>/ a partir de un design system bajado (Artifact type "Design System").
# uso: python3 scripts/preset_desde_ds.py <carpeta> --marca <slug> --handle @marca [--logo <archivo>] [--fondo-outro <color>]
#        [--acentos a,b,c] [--voz propia|elevenlabs] [--nombre MARCA]
# <carpeta>: la del artifact bajado, con project/design-system.json, project/tokens.json, project/README.md,
#   project/fonts/* y los assets bajados por id (<id>.png, <id>.svg...). El índice dice qué id es cada logo o sticker.
# Hace lo mecánico: colores, fuentes (con su ancho medido), logos y stickers renombrados, preset.json base con el
# estilo por defecto del editor. Lo que es criterio (estilo de edición, notas de marca, estrategia) se completa a mano.
import argparse, colorsys, glob, json, os, re, shutil, sys

from PIL import ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('carpeta'); ap.add_argument('--marca', required=True); ap.add_argument('--handle', required=True)
ap.add_argument('--logo'); ap.add_argument('--fondo-outro'); ap.add_argument('--acentos'); ap.add_argument('--nombre')
ap.add_argument('--voz', default='elevenlabs', choices=['propia', 'elevenlabs'])
a = ap.parse_args()
D = os.path.join(a.carpeta, 'project')
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(RAIZ, 'presets', a.marca)
idx = json.load(open(os.path.join(D, 'design-system.json')))
tok = json.load(open(os.path.join(D, 'tokens.json')))
os.makedirs(f'{OUT}/public/brand', exist_ok=True); os.makedirs(f'{OUT}/public/fonts', exist_ok=True)

# --- colores: los de valor simple (los semánticos que cambian por tema se ignoran)
colores = {}
for c in tok.get('color', {}).get('tokens', []):
    v = c.get('value')
    if isinstance(v, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', v):
        colores[c['name']] = v.upper()
def saturado(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    _, l, s = colorsys.rgb_to_hls(r, g, b)
    return s > 0.25 and 0.15 < l < 0.85
acentos = a.acentos.split(',') if a.acentos else [n for n, h in colores.items() if saturado(h)][:3] or list(colores)[:1]
oscuros = sorted(colores, key=lambda n: sum(int(colores[n][i:i + 2], 16) for i in (1, 3, 5)))
fondo = a.fondo_outro or (acentos[0] if acentos else oscuros[0])
colores = {'texto': '#FFFFFF', **colores}

# --- fuentes: archivos del DS, ancho medido, y casilleros G (titular), B (texto), S (texto en mayúsculas), K (script/itálica)
fuentes = []
for f in tok.get('type', {}).get('fonts', []):
    src = os.path.join(D, f.get('file', ''))
    if not f.get('file') or not os.path.exists(src):
        print(f"AVISO: la fuente {f.get('family')} ({f.get('file')}) no está en la carpeta: queda sin archivo", file=sys.stderr)
        continue
    shutil.copy(src, f'{OUT}/public/fonts/')
    peso = int(str(f.get('weight', '400')).split()[0]); italica = f.get('style') == 'italic'
    ft = ImageFont.truetype(src, 200); txt = 'Elegi lo que te sirve hoy mismo y consultanos'.replace(' ', '')
    fuentes.append(dict(familia=f['family'] + (' Italic' if italica else ''), archivo=os.path.basename(src), peso=peso, italica=italica,
                        ancho_min=round(ft.getlength(txt) / len(txt) / 200 + 0.01, 2),
                        ancho_may=round(ft.getlength(txt.upper()) / len(txt) / 200 + 0.01, 2)))
fams = {k: v for k, v in tok.get('type', {}).get('families', {}).items()}
def familia_de(*claves):
    for k in claves:
        for nom, val in fams.items():
            if k in nom.lower():
                primero = val.split(',')[0].strip().strip('"\'')
                cands = [f for f in fuentes if f['familia'].lower().startswith(primero.lower())]
                if cands:
                    return cands
    return []
def casillero(f, mayus, interlineado=1.0):
    return {'familia': f['familia'], 'archivo': f['archivo'], 'peso': f['peso'] if not f['italica'] else 400, 'mayusculas': mayus,
            'interlineado': interlineado, 'espaciado': 0, 'ancho': f['ancho_may'] if mayus else f['ancho_min'],
            'respaldo': 'Arial, sans-serif'}
for nom, val in fams.items():   # familias del DS sin archivo (fuentes comerciales): avisar para elegir un equivalente libre
    primero = val.split(',')[0].strip().strip('"\'')
    if not any(f['familia'].lower().startswith(primero.lower()) for f in fuentes):
        print(f"AVISO: la familia '{nom}' ({primero}) no trae archivo: se reemplaza con otra del DS; elegí un equivalente libre", file=sys.stderr)
titular = familia_de('display', 'heading', 'titular', 'serif') or fuentes
texto = familia_de('sans', 'body', 'texto') or fuentes
script = [f for f in fuentes if f['italica']] or familia_de('script', 'hand', 'cursiva')
pesado = lambda l: max((f for f in l if not f['italica']), key=lambda f: f['peso'], default=l[0] if l else None)
if not fuentes:
    sys.exit('el design system no trae archivos de fuentes: armá brand.json a mano (o bajá equivalentes libres)')
G, B = pesado(titular), pesado(texto)
slots = {'G': casillero(G, False), 'B': casillero(B, False), 'S': casillero(B, True)}
if script:
    slots['K'] = casillero(script[0], False, 1.1)

# --- assets: logos y stickers renombrados con su nombre real
renombrados = {}
for grupo, g in idx.get('assetGroups', {}).items():
    for nombre, r in g.get('files', {}).items():
        cands = glob.glob(os.path.join(a.carpeta, r['blob'] + '.*'))
        if cands:
            dst = os.path.basename(r.get('name', nombre))
            shutil.copy(cands[0], f'{OUT}/public/brand/{dst}'); renombrados[dst] = grupo
logos = [n for n, gr in renombrados.items() if 'logo' in gr.lower()]
logo = a.logo or next((n for n in logos if re.search(r'blanc|white', n, re.I)), logos[0] if logos else None)
if not logo:
    print('AVISO: no hay logos bajados: el cierre queda sin logo hasta copiar uno a public/brand', file=sys.stderr)

brand = {'nombre': a.nombre or idx.get('title', a.marca).replace('Design System –', '').replace('Design System -', '').strip().upper(),
         'handle': a.handle, 'logo': logo, 'colores': colores, 'acentos': acentos, 'fuentes': slots,
         'outro': {'fondo': fondo, 'fuenteHandle': 'S', 'colorHandle': 'texto'}}
json.dump(brand, open(f'{OUT}/brand.json', 'w'), ensure_ascii=False, indent=1)
pre_f = f'{OUT}/preset.json'
pre = json.load(open(pre_f)) if os.path.exists(pre_f) else {}
pre.update({'marca': pre.get('marca') or brand['nombre'], 'designSystem': pre.get('designSystem'),
            'voz': pre.get('voz') or ({'tipo': 'propia'} if a.voz == 'propia' else {'voice_id': 'YLtqUTaEXb7a9MAYuJu4', 'nombre': 'Julieta'}),
            'notas': pre.get('notas') or ['COMPLETAR: resumen del README del design system (voz, logo, color, tipografía, elementos).'],
            'estilo': pre.get('estilo') or {'subtitulos': {'modo': 'palabra', 'posicion': 'dinamica', 'tipografias': 'alternadas', 'color': 'blanco'}}})
json.dump(pre, open(pre_f, 'w'), ensure_ascii=False, indent=1)
print(f"presets/{a.marca}: {len(colores) - 1} colores, acentos {acentos}, fuentes " +
      ', '.join(f"{k}={v['familia']} {v['peso']}" for k, v in slots.items()) + f", {len(renombrados)} assets (logo: {logo})")
