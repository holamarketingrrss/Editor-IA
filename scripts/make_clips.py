#!/usr/bin/env python3
# Recorta cada toma del EDL a vertical 1080x1920 30fps y arma reel/src/data.json
# uso: python3 scripts/make_clips.py proyectos/<cliente>-<tema>
# Lee: edl.tsv (inicio  fin  archivo  punto_de_entrada  [objectPosition]), proyecto.json, words.json (opcional)
import json, os, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import estilo

P = sys.argv[1]
cfg = json.load(open(f'{P}/proyecto.json')) if os.path.exists(f'{P}/proyecto.json') else {}
os.makedirs(f'{P}/reel/public/clips', exist_ok=True)
E = estilo.resolver(P)
INTRO = {'logo': 0.5, 'titulo': 1.2}   # con entrada, la voz arranca después (si proyecto.json no fija voiceOffset)
audio = ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000'] if E['audioOriginal'] != 'mute' else ['-an']

clips = []
CLAVES = f'{P}/reel/public/clips/.claves.json'   # caché: una toma que no cambió no se vuelve a recortar
claves = json.load(open(CLAVES)) if os.path.exists(CLAVES) else {}
recortadas = 0
for line in open(f'{P}/edl.tsv'):
    if not line.strip():
        continue
    cols = line.rstrip('\n').split('\t')
    a, b, f, inp = float(cols[0]), float(cols[1]), cols[2], float(cols[3])
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
    sys.exit('edl.tsv está vacío')
json.dump(claves, open(CLAVES, 'w'))

if os.path.exists(f'{P}/audio/voz.mp3'):
    shutil.copy(f'{P}/audio/voz.mp3', f'{P}/reel/public/voz.mp3')

duration = cfg.get('duration', clips[-1]['end'])
outro_at = cfg.get('outroAt', round(duration - cfg.get('outroDur', 0.5 if E['cierre']['tipo'] == 'loop' else 1.94), 2))
words = json.load(open(f'{P}/words.json')) if os.path.exists(f'{P}/words.json') else []
data = dict(
    duration=duration, outroAt=outro_at, voiceOffset=cfg.get('voiceOffset', 0.3 + INTRO.get(E['entrada']['tipo'], 0)),
    voz=cfg.get('voz', os.path.exists(f'{P}/audio/voz.mp3') or os.path.exists(f'{P}/reel/public/voz.mp3')),
    clips=clips, words=words, stickers=cfg.get('stickers', []), estilo=E,
)
if cfg.get('music'):
    data['music'] = cfg['music']
    data['musicVolume'] = cfg.get('musicVolume', 0.18)
data['vozVolume'] = cfg.get('vozVolume', 1)
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'tomas', f'({recortadas} recortadas, el resto sin cambios)' if recortadas < len(clips) else '', f'(duración {duration}s, outro desde {outro_at}s)')
