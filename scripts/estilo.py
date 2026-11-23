#!/usr/bin/env python3
# Estilo de edición de una pieza: defaults del editor <- preset de la marca <- proyecto.json "estilo".
# Lo usan make_words.py, make_clips.py (lo deja resuelto en data.json "estilo") y zona_segura.py.
# uso suelto: python3 scripts/estilo.py <proyecto>   -> imprime el estilo resuelto
# Las opciones son las del brief (docs/brief.md); los nombres van en minúscula y sin tildes.
import copy, json, os, sys

DEFAULTS = {
    'subtitulos': {
        'modo': 'palabra',             # palabra | grupo (2-3 palabras) | frase | karaoke | no
        'posicion': 'dinamica',        # dinamica | abajo | medio
        'tipografias': 'alternadas',   # alternadas | una | texto+destacados
        'fuente': 'B',                 # casillero de brand.json para "una" y para el texto de "texto+destacados"
        'fuenteDestacado': 'G',        # para los destacados con "texto+destacados"
        'color': 'blanco',             # blanco (destacados en colores de marca) | marca | negro
        'legibilidad': 'sombra',       # sombra | contorno | caja | barra
        'animacion': 'pop',            # pop | fade | deslizar | maquina | no
        'destacar': [],                # palabras a destacar (si está vacío, el preset automático: 1 de cada 4)
    },
    'camara': 'pushin',                # pushin | no | punchin (salto de zoom en las palabras destacadas)
    'transicion': {'tipo': 'corte', 'dur': 0.3, 'color': None},   # corte | fundido | fundido-color | cortina | zoom | deslizar
    'entrada': {'tipo': 'gancho', 'texto': ''},                   # gancho | logo | titulo
    'cierre': {'tipo': 'logo', 'texto': ''},                      # logo | cta | congelada | loop
    'animacionLogo': 'pop',            # pop | fade | deslizar | sello | estatico
    'look': 'original',                # original | calido | vibrante | bn | vintage | cine
    'vineta': True,
    'grano': False,
    'audioOriginal': 'mute',           # mute | bajo | alto
    'sfx': {'whoosh': False, 'pop': False},
    'zocalo': None,                    # {"texto": "...", "start": 2, "end": 5}
    'logoEsquina': False,
}

OPCIONES = {
    ('subtitulos', 'modo'): ['palabra', 'grupo', 'frase', 'karaoke', 'no'],
    ('subtitulos', 'posicion'): ['dinamica', 'abajo', 'medio'],
    ('subtitulos', 'tipografias'): ['alternadas', 'una', 'texto+destacados'],
    ('subtitulos', 'color'): ['blanco', 'marca', 'negro'],
    ('subtitulos', 'legibilidad'): ['sombra', 'contorno', 'caja', 'barra'],
    ('subtitulos', 'animacion'): ['pop', 'fade', 'deslizar', 'maquina', 'no'],
    ('camara',): ['pushin', 'no', 'punchin'],
    ('transicion', 'tipo'): ['corte', 'fundido', 'fundido-color', 'cortina', 'zoom', 'deslizar'],
    ('entrada', 'tipo'): ['gancho', 'logo', 'titulo'],
    ('cierre', 'tipo'): ['logo', 'cta', 'congelada', 'loop'],
    ('animacionLogo',): ['pop', 'fade', 'deslizar', 'sello', 'estatico'],
    ('look',): ['original', 'calido', 'vibrante', 'bn', 'vintage', 'cine'],
    ('audioOriginal',): ['mute', 'bajo', 'alto'],
}

# Layout de los subtítulos agrupados (lo leen la composición y zona_segura: no duplicar en otro lado)
LAYOUT = {
    'grupo': {'tam': 120, 'maxPalabras': 3},
    'frase': {'tam': 86, 'maxPalabras': 7},
    'karaoke': {'tam': 86, 'maxPalabras': 7},
    'ancho': 900,               # ancho máximo del bloque (centrado)
    'yAbajo': 1440,             # borde inferior del bloque con posición "abajo" (zona segura termina en 1500)
    'yMedio': 960,              # centro del bloque con posición "medio"
    'tamFijo': 200,             # tamaño de palabra con modo "palabra" y posición fija
}


def mezclar(base, extra):
    out = copy.deepcopy(base)
    for k, v in (extra or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = mezclar(out[k], v)
        else:
            out[k] = v
    return out


def validar(e):
    errores = []
    for ruta, ops in OPCIONES.items():
        v = e
        for k in ruta:
            v = v.get(k) if isinstance(v, dict) else None
        if v not in ops:
            errores.append(f"estilo.{'.'.join(ruta)} = {v!r}: opciones {', '.join(ops)}")
    return errores


def resolver(P):
    """Estilo final de la pieza P: defaults <- preset de la marca (reel/src/preset.json) <- proyecto.json "estilo"."""
    e = DEFAULTS
    preset = f'{P}/reel/src/preset.json'
    if os.path.exists(preset):
        e = mezclar(e, json.load(open(preset)).get('estilo'))
    cfg = f'{P}/proyecto.json'
    if os.path.exists(cfg):
        e = mezclar(e, json.load(open(cfg)).get('estilo'))
    errores = validar(e)
    if errores:
        sys.exit('estilo inválido:\n  ' + '\n  '.join(errores))
    e = copy.deepcopy(e)
    e['layout'] = LAYOUT
    return e


if __name__ == '__main__':
    print(json.dumps(resolver(sys.argv[1].rstrip('/')), ensure_ascii=False, indent=1))
