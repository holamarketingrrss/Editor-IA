#!/usr/bin/env python3
# Genera words.json: una palabra a la vez, en posiciones distintas dentro de la zona segura 9:16.
# uso: python3 scripts/make_words.py proyectos/<cliente>-<tema>
# Lee: audio/voz.json (whisper.cpp -ml 1 -sow -ojf), reel/src/brand.json y guion.json (opcional).
# guion.json = lista, una entrada por palabra, todos los campos opcionales:
#   {"text": "Pedí", "font": "G", "color": "amarillo", "size": 300, "x": 360, "y": 700, "rot": -4, "hold": false}
# - text: corrige lo que Whisper escuchó distinto. font: G, B, S o K (casilleros de brand.json).
# - color: nombre de la paleta de la marca ("texto", "rojo"...) o un hex. Lo que falte lo decide el preset automático.
import json, math, os, shutil, sys

P = sys.argv[1]
brand = json.load(open(f'{P}/reel/src/brand.json'))
tr = json.load(open(f'{P}/audio/voz.json'))['transcription']
segs = [(s['offsets']['from'] / 1000, s['offsets']['to'] / 1000, s['text'].strip()) for s in tr if s['text'].strip()]
guion = json.load(open(f'{P}/guion.json')) if os.path.exists(f'{P}/guion.json') else []
if guion and all('text' in g for g in guion) and len(guion) != len(segs):
    sys.exit(f'guion.json tiene {len(guion)} palabras y Whisper detectó {len(segs)}: corregí el guion o el audio')

FUENTES = brand['fuentes']
ORDEN = [k for k in ('G', 'B', 'S', 'K') if k in FUENTES]
TAM = {'G': 250, 'B': 220, 'S': 130, 'K': 180}
# preset automático: posiciones (x, y, rotación) dentro de la zona segura, ciclando
POS = [(400, 560, -6), (680, 980, 3), (330, 1250, -4), (720, 640, 5), (470, 1050, -5), (760, 1300, 6),
       (380, 760, -3), (540, 1010, -4), (720, 560, 4), (330, 1260, -8), (740, 860, 5), (540, 650, -6)]
X_MIN, X_MAX, MAXW = 70, 1010, 900   # horizontal: márgenes de 70 px
Y_MIN, Y_MAX = 220, 1500             # zona segura 9:16: sin texto en los 220 px de arriba ni en los 420 de abajo
acentos = brand.get('acentos') or ['texto']

words, ajustadas = [], 0
for i, (a, b, texto) in enumerate(segs):
    g = guion[i] if i < len(guion) else {}
    font = g.get('font') or ORDEN[i % len(ORDEN)]
    color = g.get('color') or (acentos[(i // 4) % len(acentos)] if i % 4 == 3 else 'texto')
    px, py, prot = POS[i % len(POS)]
    size, x, y, rot = g.get('size', TAM[font]), g.get('x', px), g.get('y', py), g.get('rot', prot)
    text = g.get('text') or texto
    f = FUENTES[font]
    ratio = f.get('ancho', 0.5)
    width = len(text) * ratio * size
    if width > MAXW:
        size = int(MAXW / (len(text) * ratio)); width = MAXW
    alto = size * f.get('interlineado', 1)
    ang = math.radians(rot)   # la caja rotada ocupa más: se usa ella para entrar en la zona segura
    half = (abs(width * math.cos(ang)) + abs(alto * math.sin(ang))) / 2
    half_y = (abs(width * math.sin(ang)) + abs(alto * math.cos(ang))) / 2
    x2 = max(X_MIN + half, min(X_MAX - half, x))
    y2 = max(Y_MIN + half_y, min(Y_MAX - half_y, y))
    if int(x2) != int(x) or int(y2) != int(y):
        ajustadas += 1
    end = segs[i + 1][0] if i + 1 < len(segs) else b + 0.35
    words.append(dict(text=text, start=round(a, 3), end=round(end, 3), font=font, color=color,
                      size=size, x=int(x2), y=int(y2), rot=rot, hold=bool(g.get('hold', False))))
json.dump(words, open(f'{P}/words.json', 'w'), ensure_ascii=False, indent=1)
if os.path.exists(f'{P}/audio/voz.mp3'):
    os.makedirs(f'{P}/reel/public', exist_ok=True)
    shutil.copy(f'{P}/audio/voz.mp3', f'{P}/reel/public/voz.mp3')
print(len(words), 'palabras', f'({ajustadas} movidas para entrar en la zona segura)' if ajustadas else '')
