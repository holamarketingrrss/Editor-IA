#!/usr/bin/env python3
# Genera words.json: una palabra a la vez, en posiciones distintas dentro de la zona segura 9:16.
# uso: python3 scripts/make_words.py proyectos/<cliente>-<tema>
# Lee: audio/voz.json (whisper.cpp -ml 1 -sow -ojf), reel/src/brand.json y guion.json (opcional).
# guion.json = lista, una entrada por palabra, todos los campos opcionales:
#   {"text": "Pedí", "font": "G", "color": "amarillo", "size": 300, "x": 360, "y": 700, "rot": -4, "hold": false, "start": 0.1, "end": 0.4}
# - text: corrige lo que Whisper escuchó distinto. font: G, B, S o K (casilleros de brand.json).
# - color: nombre de la paleta de la marca ("texto", "rojo"...) o un hex. Lo que falte lo decide el preset automático.
import json, math, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import estilo

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

E = estilo.resolver(P)
S, L = E['subtitulos'], E['layout']
modo, posicion = S['modo'], S['posicion']
agrupado = modo in ('grupo', 'frase', 'karaoke')
norm = lambda t: ''.join(ch for ch in t.lower() if ch.isalnum())
destacar = {norm(t) for t in S['destacar']}
if S.get('rotacion'):
    ORDEN = [k for k in S['rotacion'] if k in FUENTES] or ORDEN
base = {'blanco': 'texto', 'marca': acentos[0], 'negro': '#111111'}[S['color']]
for k in (S['fuente'], S['fuenteDestacado']):
    if k not in FUENTES:
        sys.exit(f'estilo.subtitulos: la fuente {k} no está en brand.json ({", ".join(FUENTES)})')

words, ajustadas, grupo, en_grupo = [], 0, 0, 0
for i, (a, b, texto) in enumerate(segs):
    g = guion[i] if i < len(guion) else {}
    text = g.get('text') or texto
    es_dest = norm(text) in destacar if destacar else i % 4 == 3
    if g.get('color'):
        color = g['color']
    elif es_dest:
        color = acentos[(i // 4) % len(acentos)] if not destacar else acentos[len([w for w in words if w['destacado']]) % len(acentos)]
        if color == base:
            color = 'texto' if base != 'texto' else (acentos[1] if len(acentos) > 1 else color)
    else:
        color = base
    es_dest = es_dest or bool(g.get('color'))
    if S['tipografias'] == 'una':
        font = S['fuente']
    elif S['tipografias'] == 'texto+destacados':
        font = S['fuenteDestacado'] if es_dest else S['fuente']
    else:
        font = ORDEN[i % len(ORDEN)]
    font = g.get('font') or font
    f = FUENTES[font]
    ratio = f.get('ancho', 0.5)
    if agrupado:
        size, x, y, rot = L[modo]['tam'], 540, 0, 0
    elif posicion == 'dinamica':
        px, py, prot = POS[i % len(POS)]
        size, x, y, rot = g.get('size', TAM[font]), g.get('x', px), g.get('y', py), g.get('rot', prot)
    else:
        size = g.get('size', L['tamFijo'])
        alto0 = size * f.get('interlineado', 1)
        y0 = L['yAbajo'] - alto0 / 2 if posicion == 'abajo' else L['yMedio']
        x, y, rot = g.get('x', 540), g.get('y', y0), g.get('rot', 0)
    if es_dest and not g.get('size'):
        size = int(size * S.get('escalaDestacado', 1.0))
    if not agrupado:
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
        x, y = x2, y2
    end = segs[i + 1][0] if i + 1 < len(segs) else b + 0.35
    a, end = g.get('start', a), g.get('end', end)   # retoque de tiempos desde guion.json
    w = dict(text=text, start=round(a, 3), end=round(end, 3), font=font, color=color,
             size=size, x=int(x), y=int(y), rot=rot, hold=bool(g.get('hold', False)), destacado=es_dest)
    if agrupado:   # bloques de hasta N palabras; corta después de un signo de puntuación
        w['g'] = grupo
        en_grupo += 1
        if en_grupo >= L[modo]['maxPalabras'] or text.rstrip()[-1:] in '.,;:!?':
            grupo += 1; en_grupo = 0
    words.append(w)
json.dump(words, open(f'{P}/words.json', 'w'), ensure_ascii=False, indent=1)
dpath = f'{P}/reel/src/data.json'   # si make_clips.py ya corrió, se actualizan las palabras y el estilo ahí también
if os.path.exists(dpath):
    d = json.load(open(dpath))
    if d.get('clips'):
        d['words'], d['estilo'] = words, E
        json.dump(d, open(dpath, 'w'), ensure_ascii=False, indent=1)
if os.path.exists(f'{P}/audio/voz.mp3'):
    os.makedirs(f'{P}/reel/public', exist_ok=True)
    shutil.copy(f'{P}/audio/voz.mp3', f'{P}/reel/public/voz.mp3')
print(len(words), 'palabras' + (f' en {len({w["g"] for w in words})} bloques ({modo})' if agrupado else ''), f'({ajustadas} movidas para entrar en la zona segura)' if ajustadas else '')
