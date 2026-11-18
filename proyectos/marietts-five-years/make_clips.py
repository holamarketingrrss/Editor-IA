# Recorta cada toma del EDL desde el 4K vertical (2160x3840) a 1080x1920 30 fps.
# Uso: python3 make_clips.py <proyecto> [stills]   (stills: solo un cuadro por toma para revisar encuadres)
import subprocess, sys, os
P = sys.argv[1]; STILLS = 'stills' in sys.argv
SRC = f'{P}/raw/src.mp4'
HIM = (456, 1932)            # cara de él en el cuadro original
HER = {1144: (1480, 1820), 1312: (1500, 1820), 1324: (1500, 1820), 1338: (1500, 1820), 1407: (1480, 1820),
       1411: (1480, 1820), 1413: (1480, 1820), 1527: (1410, 1780), 1530: (1410, 1780), 1543: (1430, 1780), 1546: (1440, 1790)}
COLOR = 'eq=contrast=1.05:saturation=1.06:gamma=0.98'   # solo corrección
def her(src):
    return HER[max(k for k in HER if k <= int(src))]
def crop(x, y, w, h, ow=1080, oh=1920):
    x = max(0, min(2160 - w, x)); y = max(0, min(3840 - h, y))
    return f'crop={w}:{h}:{x}:{y},scale={ow}:{oh}:flags=lanczos'
def vf(kind, src):
    fx, fy = her(src)
    if kind == 'W':  return crop(0, 0, 2160, 3840)
    if kind == 'W2': return crop(160, 560, 1800, 3200)
    if kind == 'H':  return crop(0, HIM[1] - 1056, 1080, 1920)
    if kind == 'H2': return crop(0, HIM[1] - 880, 900, 1600)
    if kind == 'E':  return crop(fx - 626, fy - 1056, 1080, 1920)
    if kind == 'S':  # ella arriba, él abajo
        top = crop(fx - 693, fy - 650, 1260, 1120, 1080, 960)
        bot = crop(0, HIM[1] - 650, 1260, 1120, 1080, 960)
        return f'split[a][b];[a]{top}[t];[b]{bot}[u];[t][u]vstack'
os.makedirs(f'{P}/reel/public/clips', exist_ok=True); os.makedirs(f'{P}/stills', exist_ok=True)
clips = []
for i, line in enumerate(l for l in open(f'{P}/edl.tsv') if not l.startswith('#')):
    a, b, src, kind, note = line.rstrip('\n').split('\t'); a, b, src = float(a), float(b), float(src)
    kind, _, fx = kind.partition(':')
    chain = vf(kind, src) + ',' + (('hue=s=0,eq=contrast=1.12:brightness=0.02') if fx == 'bn' else COLOR)
    out = f'c{i:02d}.mp4'
    if STILLS:
        cmd = ['ffmpeg', '-nostdin', '-v', 'fatal', '-ss', f'{src + (b - a) / 2:.2f}', '-i', SRC, '-frames:v', '1',
               '-filter_complex', chain + ',scale=540:960', f'{P}/stills/{i:02d}_{kind}.jpg', '-y']
    else:
        cmd = ['ffmpeg', '-nostdin', '-v', 'fatal', '-ss', f'{src:.3f}', '-t', f'{b - a + 0.2:.3f}', '-i', SRC,
               '-filter_complex', chain + ',fps=30,format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '16',
               '-preset', 'fast', f'{P}/reel/public/clips/{out}', '-y']
    subprocess.run(cmd, check=True)
    clips.append(dict(file=out, start=a, end=b, src=src, kind=kind, note=note))
import json; json.dump(clips, open(f'{P}/clips.json', 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'tomas')
