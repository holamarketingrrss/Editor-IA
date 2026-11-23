#!/usr/bin/env python3
# Chequeo de zona segura 9:16 y de contraste de las palabras, sin renderizar el reel.
# uso: python3 scripts/zona_segura.py proyectos/<cliente>-<tema>            -> informe (sale con 1 si algo invade la zona segura)
#      python3 scripts/zona_segura.py proyectos/<cliente>-<tema> --frames [--max N]  -> frames clave para revisar a ojo (frame<TAB>etiqueta)
# Zona segura: sin texto ni stickers en los 220 px de arriba ni en los 420 px de abajo (y 70 px de margen lateral en palabras).
# Contraste: cociente WCAG entre el color de la palabra y la luminancia media del clip detrás (< 3:1 = aviso). No detecta caras:
# eso se revisa en los stills.
import json, math, os, subprocess, sys

FPS, W, H = 30, 1080, 1920
Y_MIN, Y_MAX = 220, 1500
X_PALABRAS, X_STICKERS = (70, 1010), (40, 1040)
CONTRASTE_MIN = 3.0

P = sys.argv[1].rstrip('/')
data = json.load(open(f'{P}/reel/src/data.json'))
brand = json.load(open(f'{P}/reel/src/brand.json'))
C = brand['colores']
col = lambda v: C.get(v, v)


def lum(hexc):
    h = hexc.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def caja(cx, cy, w, h, rot):
    a = math.radians(rot)
    bw, bh = abs(w * math.cos(a)) + abs(h * math.sin(a)), abs(w * math.sin(a)) + abs(h * math.cos(a))
    return cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2


def caja_palabra(w):
    f = brand['fuentes'][w['font']]
    return caja(w['x'], w['y'], len(w['text']) * f.get('ancho', 0.5) * w['size'], w['size'] * f.get('interlineado', 1), w['rot'])


def caja_sticker(s):
    alto = s['w']
    ruta = f'{P}/reel/public/brand/{s["img"]}'
    if os.path.exists(ruta):
        try:
            d = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                         '-of', 'csv=p=0', ruta]).decode().strip().split(',')
            alto = s['w'] * int(d[1]) / int(d[0])
        except Exception:
            pass
    return caja(s['x'], s['y'], s['w'], alto, s['rot'])


def tiempo_palabra(w):
    a, b = w['start'] + data['voiceOffset'], w['end'] + data['voiceOffset']
    return a, b


def fondo_luminancia(t, c4):
    """Luminancia media del clip en el instante t, dentro de la caja c4 (x0,y0,x1,y1). None si no se puede medir."""
    clip = next((c for c in data['clips'] if c['start'] <= t < c['end']), None)
    if not clip:
        return None, None
    ruta = f'{P}/reel/public/clips/{clip["file"]}'
    if not os.path.exists(ruta):
        return None, None
    x0, y0 = max(0, int(c4[0])), max(0, int(c4[1]))
    x1, y1 = min(W, int(c4[2])), min(H, int(c4[3]))
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None, None
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{max(0, t - clip["start"]):.3f}', '-i', ruta, '-frames:v', '1',
                        '-vf', f'crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale=8:8:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True)
    px = r.stdout
    if len(px) < 192:
        return None, None
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    ls = [0.2126 * f(px[i] / 255) + 0.7152 * f(px[i + 1] / 255) + 0.0722 * f(px[i + 2] / 255) for i in range(0, 192, 3)]
    return sum(ls) / len(ls), clip['file']


def frames_clave(maximo):
    fr = lambda t: round(t * FPS)
    obl = [(fr(data['outroAt'] + 0.7), 'cierre')] + [(fr((s['start'] + s['end']) / 2), 'sticker-' + os.path.splitext(s['img'])[0]) for s in data['stickers']]
    acentos = [w for w in data['words'] if col(w['color']).lower() != col('texto').lower()]
    grandes = [w for w in data['words'] if w['size'] >= 250 and w not in acentos]
    resto = [data['words'][0], data['words'][-1]] if data['words'] else []
    lista = list(obl)
    for w in acentos + grandes + resto:
        a, b = tiempo_palabra(w)
        lista.append((fr(max(a + 0.05, min(a + 0.2, b - 0.12))), 'palabra-' + ''.join(ch for ch in w['text'] if ch.isalnum())))
    vistos, final = set(), []
    for f, n in lista:
        if all(abs(f - v) > 3 for v in vistos):
            vistos.add(f); final.append((f, n))
        if len(final) >= maximo:
            break
    total = max(1, round(data['duration'] * FPS))
    return sorted((min(f, total - 1), n) for f, n in final)


if '--frames' in sys.argv:
    mx = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 8
    for f, n in frames_clave(mx):
        print(f'{f}\t{n}')
    sys.exit(0)

zona, aviso, medidas = [], [], 0
for w in data['words']:
    x0, y0, x1, y1 = caja_palabra(w)
    a, b = tiempo_palabra(w)
    if y0 < Y_MIN - 5 or y1 > Y_MAX + 5:
        zona.append(f"palabra «{w['text']}» ({a:.2f} s): ocupa y {y0:.0f}-{y1:.0f}; la zona segura es {Y_MIN}-{Y_MAX}")
    if x0 < X_PALABRAS[0] - 5 or x1 > X_PALABRAS[1] + 5:
        zona.append(f"palabra «{w['text']}» ({a:.2f} s): ocupa x {x0:.0f}-{x1:.0f}; el margen es {X_PALABRAS[0]}-{X_PALABRAS[1]}")
    bg, clip = fondo_luminancia(min(a + 0.25, (a + b) / 2), (x0, y0, x1, y1))
    if bg is not None:
        medidas += 1
        l = lum(col(w['color']))
        cr = (max(l, bg) + 0.05) / (min(l, bg) + 0.05)
        if cr < CONTRASTE_MIN:
            aviso.append((cr, f"palabra «{w['text']}» ({a:.2f} s): contraste {cr:.1f}:1 sobre {clip} (mínimo {CONTRASTE_MIN:g}:1); probá otro color o posición"))
for s in data['stickers']:
    x0, y0, x1, y1 = caja_sticker(s)
    if y0 < Y_MIN - 5 or y1 > Y_MAX + 5 or x0 < X_STICKERS[0] - 5 or x1 > X_STICKERS[1] + 5:
        zona.append(f"sticker {s['img']} ({s['start']:.2f} s): ocupa x {x0:.0f}-{x1:.0f}, y {y0:.0f}-{y1:.0f}; fuera de x {X_STICKERS[0]}-{X_STICKERS[1]} / y {Y_MIN}-{Y_MAX}")

print(f"Zona segura 9:16: {len(data['words'])} palabras y {len(data['stickers'])} stickers revisados; contraste medido en {medidas} palabras.")
for m in zona:
    print('  FUERA DE ZONA:', m)
aviso = [m for _, m in sorted(aviso)]  # los peores primero
for m in aviso[:5]:
    print('  CONTRASTE:', m)
if len(aviso) > 5:
    print(f'  CONTRASTE: ... y {len(aviso) - 5} palabras más con contraste bajo (aviso orientativo: no cuenta la sombra del texto)')
if not zona and not aviso:
    print('  OK: todo dentro de la zona segura y con contraste suficiente.')
print('  (las caras tapadas no se detectan acá: mirá los stills)')
sys.exit(1 if zona else 0)
