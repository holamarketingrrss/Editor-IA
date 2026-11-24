#!/usr/bin/env python3
# Cuánto gastó Claude en un proyecto: suma los tokens de su sesión (todos los pedidos y cambios hechos desde la app).
# uso: python3 scripts/uso.py proyectos/<cliente>-<tema>        (o sin argumentos: todos los proyectos con sesión)
# Lee la sesión guardada en proyectos/<id>/.claude.json y su registro en ~/.claude/projects/*/<sesion>.jsonl.
# El costo es el que calcula Claude Code (equivalente en la API; tabla propia solo si el registro no lo trae): con el login de claude.ai no se cobra aparte,
# pero ese uso cuenta para los límites del plan de la cuenta.
import collections, glob, json, os, sys

# US$ por millón de tokens: entrada, salida, lectura de caché, escritura de caché
PRECIOS = {'opus': (4.00, 20.00, 0.20, 5.00), 'sonnet': (2.00, 10.00, 0.10, 2.50),
           'haiku': (0.10, 0.50, 0.01, 0.125), 'fable': (8.00, 40.00, 0.20, 10.00)}


def precio(modelo):
    return next((v for k, v in PRECIOS.items() if k in (modelo or '')), None)


def uso_sesion(sesion):
    arch = glob.glob(os.path.expanduser(f'~/.claude/projects/*/{sesion}.jsonl'))
    if not arch:
        return None
    vistos, por_modelo = set(), collections.defaultdict(collections.Counter)
    pedidos, estados = 0, {}
    for linea in open(arch[0], encoding='utf-8'):
        try:
            e = json.loads(linea)
        except ValueError:
            continue
        m = e.get('message') or {}
        if e.get('type') == 'cost-state':
            estados[e.get('startTime')] = e   # acumulado de cada corrida de claude: vale el último
        if e.get('type') == 'user' and isinstance(m.get('content'), str):
            pedidos += 1   # un mensaje de texto = un pedido o cambio (los resultados de herramientas vienen como lista)
        if e.get('type') == 'assistant' and m.get('usage') and m.get('id') not in vistos:
            vistos.add(m['id'])   # una respuesta llega en varias líneas con el mismo id: se cuenta una vez
            u, c = m['usage'], por_modelo[m.get('model', '?')]
            c['entrada'] += u.get('input_tokens') or 0
            c['salida'] += u.get('output_tokens') or 0
            c['cache_lee'] += u.get('cache_read_input_tokens') or 0
            c['cache_escribe'] += u.get('cache_creation_input_tokens') or 0
            c['respuestas'] += 1
    oficial = collections.defaultdict(collections.Counter)
    for est in estados.values():
        for modelo, u in (est.get('modelUsage') or {}).items():
            c = oficial[modelo]
            c['entrada'] += u.get('inputTokens', 0); c['salida'] += u.get('outputTokens', 0)
            c['cache_lee'] += u.get('cacheReadInputTokens', 0); c['cache_escribe'] += u.get('cacheCreationInputTokens', 0)
            c['costo_micro'] += round(u.get('costUSD', 0) * 1e6)
            c['respuestas'] = por_modelo[modelo]['respuestas']
    return pedidos, (oficial or por_modelo)


def mostrar(P):
    f = os.path.join(P, '.claude.json')
    if not os.path.exists(f):
        print(f'{P}: sin sesión de Claude (no se hizo desde la app)'); return 0.0
    r = uso_sesion(json.load(open(f))['sesion'])
    if r is None:
        print(f'{P}: la sesión no está en esta compu (~/.claude/projects)'); return 0.0
    pedidos, por_modelo = r
    print(f'{os.path.basename(P)} · {pedidos} pedido(s)')
    total = 0.0
    for modelo, c in por_modelo.items():
        todo = c['entrada'] + c['cache_lee'] + c['cache_escribe']
        p = precio(modelo)
        if c['costo_micro']:
            costo = c['costo_micro'] / 1e6   # el que calcula Claude Code
        else:   # registro viejo sin costo: estimado con la tabla
            costo = p and (c['entrada'] * p[0] + c['salida'] * p[1] + c['cache_lee'] * p[2] + c['cache_escribe'] * p[3]) / 1e6
        total += costo or 0
        print(f'  {modelo}: {c["respuestas"]} respuestas · entrada {todo:,} tokens ({c["cache_lee"] / max(todo, 1):.0%} desde caché) '
              f'· salida {c["salida"]:,} tokens' + (f' · ≈ US$ {costo:.3f}' if costo is not None and costo < 0.1 else f' · ≈ US$ {costo:.2f}' if costo is not None else ''))
    return total


if __name__ == '__main__':
    raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    proyectos = [a.rstrip('/') for a in sys.argv[1:]] or sorted(os.path.dirname(f) for f in glob.glob(os.path.join(raiz, 'proyectos/*/.claude.json')))
    total = sum(mostrar(P) for P in proyectos)
    if len(proyectos) > 1:
        print(f'Total ≈ US$ {total:.3f}' if total < 0.1 else f'Total ≈ US$ {total:.2f}')
    print('(equivalente en la API; con el login de claude.ai cuenta para los límites del plan, no se cobra aparte)')
