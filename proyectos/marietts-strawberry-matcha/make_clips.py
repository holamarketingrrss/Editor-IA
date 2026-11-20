# Recorta cada toma del EDL a 1080x1920 30fps con zoom (crop nativo 4K), corrección de color y nitidez
import json, subprocess, sys, os
P = sys.argv[1]
os.makedirs(f'{P}/reel/public/clips', exist_ok=True)
SW, SH = 2160, 3840  # fuente vertical tras rotación
GRADE = {
    # leve contraste + saturación, nitidez
    'base': 'eq=contrast=1.06:brightness=0.01:saturation=1.10:gamma=1.02',
    # toma cálida/naranja: bajar temperatura y saturación
    'warm': 'colorbalance=rs=-0.12:gs=-0.03:bs=0.10:rm=-0.10:gm=-0.02:bm=0.08:rh=-0.05:bh=0.04,eq=contrast=1.05:saturation=0.82:gamma=1.03',
    # toma oscura: levantar sombras y medios
    'dark': 'eq=contrast=1.05:brightness=0.05:saturation=1.08:gamma=1.30,curves=all=0/0 0.25/0.33 0.7/0.78 1/1',
}
clips = []
for i, line in enumerate(l for l in open(f'{P}/edl.tsv') if not l.startswith('#')):
    a, b, f, inp, z, cx, cy, g = line.rstrip('\n').split('\t')[:8]
    a, b, inp, z, cx, cy = map(float, (a, b, inp, z, cx, cy))
    w, h = round(SW / z / 2) * 2, round(SH / z / 2) * 2
    x = min(max(cx * SW - w / 2, 0), SW - w); y = min(max(cy * SH - h / 2, 0), SH - h)
    vf = (f'crop={w}:{h}:{x:.0f}:{y:.0f},scale=1080:1920:flags=lanczos,fps=30,{GRADE[g]},'
          f'unsharp=5:5:0.7:5:5:0.0,format=yuv420p')
    out = f'c{i:02d}.mp4'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(inp), '-t', f'{b-a+0.3:.2f}', '-i', f'{P}/raw/{f}',
        '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', f'{P}/reel/public/clips/{out}', '-y'], check=True)
    clips.append(dict(file=out, start=a, end=b, src=f, inPoint=inp))
data = dict(duration=20.0, outroAt=16.30, clips=clips, music='music.mp3')
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'tomas')
