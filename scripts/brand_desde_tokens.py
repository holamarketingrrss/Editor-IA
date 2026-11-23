#!/usr/bin/env python3
# Arma reel/src/brand.json a partir del tokens.json del design system del cliente.
# uso: python3 scripts/brand_desde_tokens.py tokens.json --handle @marca --logo logo.png --out brand.json
#        [--fondo-outro rojo] [--acentos amarillo,naranja,rojo] [--nombre MARCA]
import argparse, json, re, sys

ap = argparse.ArgumentParser()
ap.add_argument('tokens'); ap.add_argument('--out', required=True)
ap.add_argument('--handle', required=True); ap.add_argument('--logo', default='logo.png')
ap.add_argument('--nombre'); ap.add_argument('--fondo-outro'); ap.add_argument('--acentos')
a = ap.parse_args()

t = json.load(open(a.tokens))
# colores: solo los tokens de valor simple (los que cambian según el tema se ignoran)
colores = {c['name']: c['value'].upper() for c in t['color']['tokens']
           if isinstance(c['value'], str) and re.fullmatch(r'#[0-9a-fA-F]{6}', c['value'])}
colores['texto'] = colores.get('blanco', '#FFFFFF')

NEUTROS = {'blanco', 'negro', 'papel', 'crema', 'logo-ambar', 'texto'}
if a.acentos:
    acentos = a.acentos.split(',')
else:
    acentos = [n for n in colores if n not in NEUTROS][:3]
faltan = [n for n in acentos + ([a.fondo_outro] if a.fondo_outro else []) if n not in colores]
if faltan:
    sys.exit(f'colores que no existen en el design system: {faltan}. Hay: {sorted(colores)}')
fondo = a.fondo_outro or acentos[0]

fams, fonts = t['type']['families'], t['type']['fonts']
def primera(stack):  # '"League Gothic", "Bebas Neue", Impact' -> League Gothic
    return stack.split(',')[0].strip().strip('"\'')
def buscar(familia, peso=None):
    c = [f for f in fonts if f['family'] == familia]
    if not c:
        return None
    if peso:
        c.sort(key=lambda f: abs(int(str(f['weight']).split()[0]) - peso))
    return c[0]

# casilleros del video: G display, B logotipo, S texto en negrita, K script
SLOTS = {
    'G': dict(fam='display', peso=400, mayusculas=True,  interlineado=0.9, espaciado=1,  ancho=0.33),
    'B': dict(fam='logo',    peso=400, mayusculas=True,  interlineado=0.9, espaciado=2,  ancho=0.37),
    'S': dict(fam='sans',    peso=700, mayusculas=True,  interlineado=1,   espaciado=-1, ancho=0.62),
    'K': dict(fam='script',  peso=400, mayusculas=False, interlineado=1.1, espaciado=0,  ancho=0.48),
}
RESPALDO = {'K': 'cursive'}
fuentes, avisos = {}, []
for k, s in SLOTS.items():
    if s['fam'] not in fams:
        avisos.append(f'el design system no define la familia "{s["fam"]}" (casillero {k}): usa una de respaldo del sistema')
        nombre, archivo = 'Arial', None
    else:
        nombre = primera(fams[s['fam']])
        f = buscar(nombre, s['peso'])
        archivo = f['file'].split('/')[-1] if f else None
        if not archivo:
            avisos.append(f'"{nombre}" (casillero {k}) no tiene archivo de fuente en el design system: se verá la fuente de respaldo del sistema. Conseguí un woff2 y completá "archivo" en brand.json')
    fuentes[k] = dict(familia=nombre, archivo=archivo, peso=s['peso'], mayusculas=s['mayusculas'],
                      interlineado=s['interlineado'], espaciado=s['espaciado'], ancho=s['ancho'],
                      respaldo=RESPALDO.get(k, 'sans-serif'))

brand = dict(nombre=a.nombre or re.sub(r'^Design System\s*[–-]\s*', '', t.get('name', 'MARCA')), handle=a.handle,
             logo=a.logo, colores=colores, acentos=acentos, fuentes=fuentes,
             outro=dict(fondo=fondo, fuenteHandle='S', colorHandle='texto'))
json.dump(brand, open(a.out, 'w'), ensure_ascii=False, indent=1)
print(f'brand.json -> {a.out} ({len(colores)} colores, acentos: {", ".join(acentos)}, fondo del cierre: {fondo})')
for m in avisos:
    print('AVISO:', m, file=sys.stderr)
