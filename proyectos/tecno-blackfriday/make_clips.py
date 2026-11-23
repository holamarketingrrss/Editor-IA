# Recorta cada toma del EDL (inicio, fin, archivo, entrada, zoom) a 1080x1920 30 fps con corrección suave,
# y arma reel/src/data.json con palabras y outro.
import json, subprocess, sys
P = sys.argv[1] if len(sys.argv) > 1 else '.'
CORR = 'null'  # sin corrección: la toma tal cual (v2)
clips = []
for i, line in enumerate(open(f'{P}/edl.tsv')):
    a, b, f, inp, z = line.strip().split('\t'); a, b, inp, z = float(a), float(b), float(inp), float(z)
    out = f'c{i:02d}.mp4'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(inp), '-t', f'{b-a+0.2:.2f}', '-i', f'{P}/raw/{f}.MP4',
        '-vf', f'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,{CORR},format=yuv420p',
        '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'fast', f'{P}/reel/public/clips/{out}', '-y'], check=True)
    clips.append(dict(file=out, start=a, end=b, src=f, inPoint=inp, zoom=z, broll=f in ('C4671', 'C4672', 'C4673')))
words = json.load(open(f'{P}/words.json'))
voice_end = clips[-1]['end']
data = dict(duration=round(voice_end + 2.3, 2), outroAt=voice_end, clips=clips, words=words,
            hook=dict(start=0.0, end=3.0, tag='BLACK FRIDAY', text='No compres por impulso'))
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print(len(clips), 'tomas', data['duration'], 's')
