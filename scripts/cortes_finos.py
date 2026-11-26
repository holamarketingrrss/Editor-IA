#!/usr/bin/env python3
# Ajusta cada toma del EDL a donde empieza y termina la voz: saca aire, respiraciones y ruidos antes y después de
# cada frase (reels de persona a cámara). Mira la energía del audio de la toma alrededor del corte que puso el EDL.
# uso: python3 scripts/cortes_finos.py <proyecto> [--probar]     (--probar muestra los cambios sin escribir edl.tsv)
# El EDL queda continuo (cada toma empieza donde termina la anterior); las filas "escena:<id>" no se tocan.
# Lo corre voz_tomas.sh antes de armar la voz, así video, voz y subtítulos quedan con el mismo corte.
import subprocess, sys
import numpy as np

P = sys.argv[1].rstrip('/')
PROBAR = '--probar' in sys.argv
SR, VENT = 16000, 0.01                  # análisis en ventanas de 10 ms
ANTES, DESPUES = 0.035, 0.09            # aire que se deja antes de la primera sílaba y después de la última
BUSCA_AFUERA, BUSCA_ADENTRO = 0.25, 0.7  # cuánto puede correrse cada borde: hacia afuera (si el EDL cortó una sílaba) y hacia adentro
MIN_VOZ = 0.06                          # una "voz" dura al menos 60 ms seguidos (un click o un golpe no cuenta)


def audio(f, desde, dur):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{max(0, desde):.3f}', '-t', f'{dur:.3f}', '-i', f'{P}/raw/{f}',
                        '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768


def db(x):
    n = int(SR * VENT); k = len(x) // n
    if k == 0:
        return np.array([])
    rms = np.sqrt((x[:k * n].reshape(k, n) ** 2).mean(1) + 1e-12)
    return 20 * np.log10(rms)


NIVEL = {}


def nivel(f):
    """nivel de la voz en toda la toma (percentil 95 de la energía): referencia estable para el umbral"""
    if f not in NIVEL:
        r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', f'{P}/raw/{f}', '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True)
        e = db(np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768)
        NIVEL[f] = float(np.percentile(e, 95)) if len(e) else -20.0
    return NIVEL[f]


def ajustar(f, inp, dur, fijo_a=False, fijo_b=False):
    """fijo_a / fijo_b: ese borde toca otro tramo de la misma toma (se dejó corrido a propósito): no se mueve"""
    ini = max(0, inp - BUSCA_AFUERA); x = audio(f, ini, dur + 2 * BUSCA_AFUERA); e = db(x)
    if len(e) < 10:
        return inp, dur
    umbral = max(-45, nivel(f) - 20)   # la respiración y el ambiente quedan bastante más bajos que la voz
    voz = e > umbral; m = int(MIN_VOZ / VENT)
    seguida = np.convolve(voz.astype(int), np.ones(m, int), 'valid') == m   # m ventanas seguidas con voz
    if not seguida.any():
        return inp, dur
    a_rel, b_rel = inp - ini, inp - ini + dur                      # el corte original, en tiempo de la ventana
    # huecos de menos de 40 ms dentro de una palabra no la cortan
    hueco = int(0.04 / VENT); v = voz.copy()
    for i in range(len(v)):
        if not v[i] and v[max(0, i - hueco):i].any() and v[i + 1:i + 1 + hueco].any():
            v[i] = True
    ia, ib = min(len(v) - 1, int(a_rel / VENT)), min(len(v) - 1, max(0, int(b_rel / VENT) - 1))
    idx = np.nonzero(seguida)[0]
    # plano casi sin voz (producto, gesto, reacción): no se toca, aunque asome una palabra en un borde
    if not idx[(idx >= ia) & (idx + m <= ib + 1)].any() or v[ia:ib + 1].mean() < 0.3:
        return inp, dur
    # una palabra "cortada" tiene que estar al menos 0,1 s adentro del corte; si apenas asoma, es la frase de al lado
    adentro = int(0.1 / VENT)
    if v[ia] and not v[ia:ia + adentro].all():
        v[ia] = False
    if v[ib] and not v[max(0, ib - adentro + 1):ib + 1].all():
        v[ib] = False
    if v[ia]:   # el EDL cortó en medio de una palabra: se retrocede hasta donde empieza (sin pasar BUSCA_AFUERA)
        i = ia
        while i > 0 and v[i - 1] and (ia - i) * VENT < BUSCA_AFUERA:
            i -= 1
        a = i * VENT - ANTES
    else:       # cortó en silencio o aire: se adelanta hasta la primera voz (sin pasar BUSCA_ADENTRO)
        cand = idx[(idx >= ia) & (idx * VENT <= a_rel + BUSCA_ADENTRO)]
        a = cand[0] * VENT - ANTES if len(cand) else a_rel
    if v[ib]:   # cortó en medio de una palabra: se estira hasta que termina
        i = ib
        while i < len(v) - 1 and v[i + 1] and (i - ib) * VENT < BUSCA_AFUERA:
            i += 1
        b = (i + 1) * VENT + DESPUES
    else:       # cortó en silencio: se retrocede hasta el final de la última voz
        cand = idx[(idx + m <= ib + 1) & ((idx + m) * VENT >= b_rel - BUSCA_ADENTRO)]
        b = (cand[-1] + m) * VENT + DESPUES if len(cand) else b_rel
    a, b = max(a, a_rel - BUSCA_AFUERA), min(b, b_rel + BUSCA_AFUERA)
    if fijo_a: a = a_rel
    if fijo_b: b = b_rel
    if b - a < 0.3:   # algo raro: se deja como estaba
        return inp, dur
    return round(ini + a, 3), round(b - a, 3)


filas = [l.rstrip('\n').split('\t') for l in open(f'{P}/edl.tsv') if l.strip()]
t, nuevas, ahorro = 0.0, [], 0.0
for c in filas:
    a, b, f = float(c[0]), float(c[1]), c[2]
    inp = float(c[3]) if len(c) > 3 and c[3] else 0.0
    dur = b - a
    if not f.startswith('escena:'):
        # bordes pegados (menos de 0,3 s) a otro tramo de la misma toma: no se tocan, para no repetir ni comer audio
        otros = [(float(o[3]), float(o[3]) + float(o[1]) - float(o[0])) for o in filas if o is not c and o[2] == f and len(o) > 3 and o[3]]
        fijo_a = any(abs(oe - inp) < 0.3 for _, oe in otros)
        fijo_b = any(abs(oi - (inp + dur)) < 0.3 for oi, _ in otros)
        inp2, dur2 = ajustar(f, inp, dur, fijo_a, fijo_b)
        if abs(inp2 - inp) > 0.01 or abs(dur2 - dur) > 0.01:
            print(f'  {f} @{inp:.2f}: {dur:.2f} s -> {dur2:.2f} s ({"+" if dur2 > dur else ""}{dur2 - dur:.2f})')
        ahorro += dur - dur2; inp, dur = inp2, dur2
    resto = c[4:] if len(c) > 4 else []
    nuevas.append('\t'.join([f'{t:.2f}', f'{t + dur:.2f}', f, f'{inp:.2f}', *resto]))
    t += dur
print(f'cortes finos: {len(filas)} tomas, {ahorro:+.2f} s {"menos" if ahorro >= 0 else "más"} (total {t:.2f} s)' + (' [prueba: sin escribir]' if PROBAR else ''))
if not PROBAR:
    open(f'{P}/edl.tsv', 'w').write('\n'.join(nuevas) + '\n')
