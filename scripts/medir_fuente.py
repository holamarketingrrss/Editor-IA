#!/usr/bin/env python3
# Ancho medio por letra de una fuente (respecto del tamaño), en minúsculas y en mayúsculas. Lo usan los scripts para
# que las palabras entren en el ancho. uso: python3 scripts/medir_fuente.py <archivo .ttf/.otf/.woff2>  -> {"min": .., "may": ..}
import json, sys
from PIL import ImageFont
txt = 'Elegi lo que te sirve hoy mismo y consultanos'.replace(' ', '')
try:
    ft = ImageFont.truetype(sys.argv[1], 200)
    print(json.dumps({'min': round(ft.getlength(txt) / len(txt) / 200 + 0.01, 2), 'may': round(ft.getlength(txt.upper()) / len(txt) / 200 + 0.01, 2)}))
except Exception as e:   # sin soporte para el formato (p. ej. woff2 sin brotli): un ancho promedio
    print(json.dumps({'min': 0.55, 'may': 0.66, 'aviso': str(e)}))
