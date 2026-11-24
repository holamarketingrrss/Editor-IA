#!/usr/bin/env python3
# Cuánto gastó Claude en un proyecto: suma los tokens de su sesión (todos los pedidos y cambios hechos desde la app).
# uso: python3 scripts/uso.py proyectos/<cliente>-<tema>        (o sin argumentos: todos los proyectos con sesión)
#      python3 scripts/uso.py --pasos proyectos/<id>         detalle paso a paso: qué cargó el contexto
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


def pasos(P):
    """Detalle por paso: qué hizo Claude y cuánto contexto cargaba (para encontrar lo que más gasta)."""
    sesion = json.load(open(os.path.join(P, '.claude.json')))['sesion']
    arch = glob.glob(os.path.expanduser(f'~/.claude/projects/*/{sesion}.jsonl'))[0]
    herr, filas, vistos = {}, [], set()
    for linea in open(arch, encoding='utf-8'):
        try:
            e = json.loads(linea)
        except ValueError:
            continue
        m = e.get('message') or {}
        cont = m.get('content') if isinstance(m.get('content'), list) else []
        if e.get('type') == 'assistant':
            for c in cont:
                if c.get('type') == 'tool_use':
                    i = c.get('input', {})
                    det = i.get('description') or i.get('command') or i.get('file_path') or i.get('pattern') or json.dumps(i, ensure_ascii=False)
                    herr[c['id']] = [c['name'].replace('mcp__claude_ai_', '').replace('mcp__', ''), str(det)[:70], 0, False]
            u = m.get('usage')
            if u and m.get('id') not in vistos:
                vistos.add(m['id'])
                ctx = (u.get('input_tokens') or 0) + (u.get('cache_read_input_tokens') or 0) + (u.get('cache_creation_input_tokens') or 0)
                filas.append([ctx, u.get('cache_creation_input_tokens') or 0, u.get('output_tokens') or 0, []])
        if e.get('type') == 'user':
            for c in cont:
                if c.get('type') == 'tool_result' and c.get('tool_use_id') in herr:
                    r = c.get('content')
                    imgs = sum(1 for x in r if isinstance(x, dict) and x.get('type') == 'image') if isinstance(r, list) else 0
                    herr[c['tool_use_id']][2] = len(json.dumps(r, ensure_ascii=False)) if not imgs else 0
                    herr[c['tool_use_id']][3] = imgs > 0
                    if filas:
                        filas[-1][3].append(herr[c['tool_use_id']])
    print(f'{os.path.basename(P)} · {len(filas)} respuestas de Claude')
    print(f'{"#":>3} {"contexto":>9} {"nuevo":>7} {"salida":>6}  pasos que pidió (tamaño del resultado)')
    for n, (ctx, nuevo, sal, hs) in enumerate(filas, 1):
        desc = '; '.join(f"{h[0]} {h[1]} ({'IMAGEN' if h[3] else str(h[2] // 4) + ' tok'})" for h in hs) or '(texto)'
        print(f'{n:>3} {ctx:>9,} {nuevo:>7,} {sal:>6,}  {desc[:160]}')
    grandes = sorted((h for h in herr.values()), key=lambda h: -h[2])[:8]
    print('Resultados más pesados (cada uno se relee en todos los pasos siguientes):')
    for h in grandes:
        print(f'  ~{h[2] // 4:,} tok  {h[0]}  {h[1]}')
    print(f'Imágenes leídas: {sum(1 for h in herr.values() if h[3])}')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--pasos':
        pasos(sys.argv[2].rstrip('/')); sys.exit(0)
    raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    proyectos = [a.rstrip('/') for a in sys.argv[1:]] or sorted(os.path.dirname(f) for f in glob.glob(os.path.join(raiz, 'proyectos/*/.claude.json')))
    total = sum(mostrar(P) for P in proyectos)
    if len(proyectos) > 1:
        print(f'Total ≈ US$ {total:.3f}' if total < 0.1 else f'Total ≈ US$ {total:.2f}')
    print('(equivalente en la API; con el login de claude.ai cuenta para los límites del plan, no se cobra aparte)')
