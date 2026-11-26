#!/usr/bin/env python3
# Recorta cada toma del EDL a vertical 1080x1920 30fps y arma reel/src/data.json
# uso: python3 scripts/make_clips.py proyectos/<cliente>-<tema>
# Lee: edl.tsv (inicio  fin  archivo  punto_de_entrada  [objectPosition]), proyecto.json, words.json (opcional)
# Motion graphics: proyecto.json "escenas" (ver docs/escenas.md). Sin edl.tsv, el video son las escenas en orden;
# con edl.tsv, una fila con archivo "escena:<id>" pone esa escena en lugar de una toma.
import json, os, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import estilo

P = sys.argv[1]
cfg = json.load(open(f'{P}/proyecto.json')) if os.path.exists(f'{P}/proyecto.json') else {}
os.makedirs(f'{P}/reel/public/clips', exist_ok=True)
E = estilo.resolver(P)
INTRO = {'logo': 0.5, 'titulo': 1.2}   # con entrada, la voz arranca después (si proyecto.json no fija voiceOffset)
audio = ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000'] if E['audioOriginal'] != 'mute' else ['-an']

ESCENAS = {str(e.get('id', i + 1)): e for i, e in enumerate(cfg.get('escenas', []))}
IMG = ('.png', '.jpg', '.jpeg', '.webp', '.svg')


def escena(e):
    """La escena como la usa la composición: las imágenes de raw/ (o de cualquier lado del proyecto) pasan a public/img/."""
    e = dict(e)
    img = e.get('img')
    if img and not os.path.exists(f'{P}/reel/public/{img}'):
        for cand in (f'{P}/raw/{img}', f'{P}/{img}'):
            if os.path.exists(cand) and cand.lower().endswith(IMG):
                os.makedirs(f'{P}/reel/public/img', exist_ok=True)
                shutil.copy(cand, f'{P}/reel/public/img/{os.path.basename(img)}')
                e['img'] = f'img/{os.path.basename(img)}'
                break
        else:
            sys.exit(f'escena {e.get("id", "")}: no encuentro la imagen {img} (en raw/ o reel/public/)')
    return e


filas = []
if os.path.exists(f'{P}/edl.tsv'):
    filas = [l.rstrip('\n').split('\t') for l in open(f'{P}/edl.tsv') if l.strip()]
if not filas and ESCENAS:   # video solo de motion graphics: las escenas en orden, con su duración
    t = 0.0
    for k, e in ESCENAS.items():
        d = float(e.get('dur', 2.5))
        filas.append([f'{t:.2f}', f'{t + d:.2f}', f'escena:{k}', '0'])
        t += d

clips = []
CLAVES = f'{P}/reel/public/clips/.claves.json'   # caché: una toma que no cambió no se vuelve a recortar
claves = json.load(open(CLAVES)) if os.path.exists(CLAVES) else {}
recortadas = 0
for cols in filas:
    a, b, f, inp = float(cols[0]), float(cols[1]), cols[2], float(cols[3] if len(cols) > 3 and cols[3] else 0)
    if f.startswith('escena:'):
        k = f.split(':', 1)[1]
        if k not in ESCENAS:
            sys.exit(f'edl.tsv: no existe la escena "{k}" en proyecto.json (hay: {", ".join(ESCENAS) or "ninguna"})')
        clips.append(dict(tipo='escena', start=a, end=b, escena=escena(ESCENAS[k])))
        continue
    out = f'c{len(clips):02d}.mp4'
    clave = f'{f}|{inp}|{b-a+0.4:.2f}|{audio[0]}|{os.path.getmtime(f"{P}/raw/{f}"):.0f}'
    if claves.get(out) != clave or not os.path.exists(f'{P}/reel/public/clips/{out}'):
        recortadas += 1; claves[out] = clave
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(inp), '-t', f'{b-a+0.4:.2f}', '-i', f'{P}/raw/{f}',
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p',
            *audio, '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', f'{P}/reel/public/clips/{out}', '-y'], check=True)
    clip = dict(file=out, start=a, end=b, src=f, inPoint=inp)
    if len(cols) > 4 and cols[4]:
        clip['pos'] = cols[4]
    clips.append(clip)
if not clips:
    sys.exit('no hay tomas ni escenas: falta edl.tsv o proyecto.json "escenas"')
json.dump(claves, open(CLAVES, 'w'))

if os.path.exists(f'{P}/audio/voz.mp3'):
    shutil.copy(f'{P}/audio/voz.mp3', f'{P}/reel/public/voz.mp3')

OUTRO = cfg.get('outroDur', 0.5 if E['cierre']['tipo'] == 'loop' else 1.94)
solo_escenas = all(c.get('tipo') == 'escena' for c in clips)
if solo_escenas and 'duration' not in cfg and E['cierre']['tipo'] in ('logo', 'anillo', 'cta'):
    # motion graphics: el cierre va después de la última escena (no la tapa)
    duration = round(clips[-1]['end'] + OUTRO, 2)
    outro_at = cfg.get('outroAt', clips[-1]['end'])
else:
    duration = cfg.get('duration', clips[-1]['end'])
    outro_at = cfg.get('outroAt', round(duration - OUTRO, 2))
words = json.load(open(f'{P}/words.json')) if os.path.exists(f'{P}/words.json') else []
data = dict(
    duration=duration, outroAt=outro_at, voiceOffset=cfg.get('voiceOffset', 0.3 + INTRO.get(E['entrada']['tipo'], 0)),
    voz=cfg.get('voz', os.path.exists(f'{P}/audio/voz.mp3') or os.path.exists(f'{P}/reel/public/voz.mp3')),
    clips=clips, words=words, stickers=cfg.get('stickers', []), graficos=cfg.get('graficos', []), estilo=E,
)
if cfg.get('music'):
    data['music'] = cfg['music']
    data['musicVolume'] = cfg.get('musicVolume', 0.18)
data['vozVolume'] = cfg.get('vozVolume', 1)
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
n_esc = sum(1 for c in clips if c.get('tipo') == 'escena')
print(len(clips) - n_esc, 'tomas', f'+ {n_esc} escenas' if n_esc else '', f'({recortadas} recortadas, el resto sin cambios)' if recortadas < len(clips) - n_esc else '', f'(duración {duration}s, outro desde {outro_at}s)')
