# Arma los clips 1080x1920 (o paneles 1080x540) desde el EDL, sin zoom, con color match por neutros
import json, subprocess, sys, os
import numpy as np
P = sys.argv[1]; os.makedirs(f'{P}/reel/public/clips', exist_ok=True)
TARGET = np.array([1.025, 1.0, 0.955])  # neutros levemente cálidos, común a todas las tomas
TARGET_Y = 0.47                          # luminancia media objetivo

def src_path(f): return f'{P}/{f}' if f.startswith('ai/') else f'{P}/raw/{f}'

def geom(mode, dur):
    if mode == 'rot': return 'transpose=1'
    if mode == 'full': return 'scale=1080:1920:flags=lanczos'
    if mode == 'panel': return 'scale=1131:636:flags=lanczos,crop=1080:636:25:0'
    if mode == 'photo': return f"scale=1280:1920:flags=lanczos,crop=1080:1920:'200*t/{dur}':0"

def base_cmd(f, inp, dur, speed, mode):
    if mode == 'photo':
        return ['-loop', '1', '-framerate', '30', '-t', f'{dur}', '-i', src_path(f)]
    return ['-ss', str(inp), '-t', f'{dur*speed+0.1:.2f}', '-i', src_path(f)]

def stats(f, inp, dur, speed, mode):
    vf = geom(mode, dur) + (f',setpts=PTS/{speed}' if speed != 1 else '') + ',fps=2,scale=270:-2,format=rgb24'
    raw = subprocess.run(['ffmpeg', '-v', 'error', *base_cmd(f, inp, dur, speed, mode), '-vf', vf, '-f', 'rawvideo', '-'],
                         capture_output=True, check=True).stdout
    px = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.float32) / 255
    y = px @ np.array([0.2126, 0.7152, 0.0722]); mx, mn = px.max(1), px.min(1)
    sat = (mx - mn) / (mx + 1e-6)
    neutral = px[(sat < 0.15) & (y > 0.15) & (y < 0.9)]
    m = neutral.mean(0) if len(neutral) > 500 else px.mean(0)
    return m / m[1], float(np.median(y))

clips = []; panels = []
for i, line in enumerate(l for l in open(f'{P}/edl.tsv') if not l.startswith('#')):
    a, b, f, inp, speed, mode = line.rstrip('\n').split('\t')[:6]
    a, b, inp, speed = float(a), float(b), float(inp), float(speed); dur = b - a
    ratio, ymed = stats(f, inp, dur, speed, mode)
    gain = TARGET / ratio; gain = 1 + (gain - 1) * 0.8          # corrección del 80% hacia el neutro común
    gain = np.clip(gain / (gain @ [0.2126, 0.7152, 0.0722]), 0.8, 1.25)
    gamma = float(np.clip(np.log(TARGET_Y) / np.log(max(ymed, 0.05)), 0.9, 1.12))  # iguala luminancia (suave)
    grade = (f'colorchannelmixer=rr={gain[0]:.3f}:gg={gain[1]:.3f}:bb={gain[2]:.3f},'
             f'eq=gamma={1/gamma:.3f}:contrast=1.04:saturation=1.03')
    vf = geom(mode, dur) + (f',setpts=PTS/{speed}' if speed != 1 else '') + f',fps=30,{grade},format=yuv420p'
    out = f'c{i:02d}.mp4'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', *base_cmd(f, inp, dur, speed, mode), '-t', f'{dur+0.1:.2f}',
        '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', f'{P}/reel/public/clips/{out}', '-y'], check=True)
    print(out, f, 'neutro', ratio.round(3), 'y', round(ymed, 2), 'gain', gain.round(3), 'gamma', round(gamma, 2))
    item = dict(file=out, start=a, end=b, src=f, inPoint=inp)
    (panels if mode == 'panel' else clips).append(item)
data = dict(titlesEnd=10.7, duration=23.0, splitAt=15.2, fadeAt=20.2, clips=clips, panels=panels, music='music.mp3')
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
