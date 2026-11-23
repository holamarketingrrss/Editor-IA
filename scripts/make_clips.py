#!/usr/bin/env python3
# Recorta cada toma del EDL a vertical 1080x1920 30fps y arma reel/src/data.json
# uso: python3 scripts/make_clips.py proyectos/<cliente>-<tema>
# Lee: edl.tsv (inicio  fin  archivo  punto_de_entrada  [objectPosition]), proyecto.json, words.json (opcional)
import json, os, subprocess, sys

P = sys.argv[1]
cfg = json.load(open(f'{P}/proyecto.json')) if os.path.exists(f'{P}/proyecto.json') else {}
os.makedirs(f'{P}/reel/public/clips', exist_ok=True)

clips = []
for line in open(f'{P}/edl.tsv'):
    if not line.strip():
        continue
    cols = line.rstrip('\n').split('\t')
    a, b, f, inp = float(cols[0]), float(cols[1]), cols[2], float(cols[3])
    out = f'c{len(clips):02d}.mp4'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(inp), '-t', f'{b-a+0.4:.2f}', '-i', f'{P}/raw/{f}',
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p',
        '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', f'{P}/reel/public/clips/{out}', '-y'], check=True)
    clip = dict(file=out, start=a, end=b, src=f, inPoint=inp)
    if len(cols) > 4 and cols[4]:
        clip['pos'] = cols[4]
    clips.append(clip)
if not clips:
    sys.exit('edl.tsv está vacío')

duration = cfg.get('duration', clips[-1]['end'])
outro_at = cfg.get('outroAt', round(duration - cfg.get('outroDur', 1.94), 2))
words = json.load(open(f'{P}/words.json')) if os.path.exists(f'{P}/words.json') else []
data = dict(
    duration=duration, outroAt=outro_at, voiceOffset=cfg.get('voiceOffset', 0.3),
    voz=cfg.get('voz', os.path.exists(f'{P}/audio/voz.mp3') or os.path.exists(f'{P}/reel/public/voz.mp3')),
    clips=clips, words=words, stickers=cfg.get('stickers', []),
)
if cfg.get('music'):
    data['music'] = cfg['music']
    data['musicVolume'] = cfg.get('musicVolume', 0.18)
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'tomas', f'(duración {duration}s, outro desde {outro_at}s)')
