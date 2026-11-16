# Recorta cada toma del EDL a vertical 1080x1920 30fps y arma reel/src/data.json
import json, subprocess, sys
P = sys.argv[1]
clips = []
for i, line in enumerate(open(f'{P}/edl.tsv')):
    a, b, f, inp = line.strip().split('\t'); a, b, inp = float(a), float(b), float(inp)
    out = f'c{i:02d}.mp4'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(inp), '-t', f'{b-a+0.4:.2f}', '-i', f'{P}/raw/{f}',
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p',
        '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', f'{P}/reel/public/clips/{out}', '-y'], check=True)
    clips.append(dict(file=out, start=a, end=b, src=f, inPoint=inp))
words = json.load(open(f'{P}/words.json'))
stickers = [
    dict(img='bandera.png', start=5.25, end=6.10, x=850, y=470, w=230, rot=10, white=True),
    dict(img='corazones.png', start=7.48, end=8.32, x=230, y=1380, w=230, rot=-8, white=True),
    dict(img='sonrisa.png', start=9.08, end=10.06, x=850, y=480, w=220, rot=8, white=True),
]
data = dict(duration=12.0, outroAt=10.06, voiceOffset=0.3, clips=clips, words=words, stickers=stickers)
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'tomas')
