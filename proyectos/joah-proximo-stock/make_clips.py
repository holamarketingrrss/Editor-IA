# Recorta cada toma del EDL (vertical 1080x1920, 30 fps) con corrección de color "mejorar 50%",
# arma la pista de voz (audio original de las tomas habladas) y escribe parte de reel/src/data.json
import json, subprocess, sys
P = sys.argv[1]
# mejorar ~50/100: más contraste y saturación, negros firmes, leve nitidez (sin quemar piel)
GRADE = 'eq=contrast=1.10:saturation=1.22:brightness=0.015:gamma=0.97,colorbalance=rm=0.02:bm=-0.02,unsharp=5:5:0.45'
clips = []
for i, line in enumerate(open(f'{P}/edl.tsv')):
    a, b, f, inp, zoom, trans = line.strip().split('\t'); a, b, inp = float(a), float(b), float(inp)
    out = f'c{i:02d}.mp4'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(inp), '-t', f'{b-a+0.3:.2f}', '-i', f'{P}/raw/{f}',
        '-vf', f'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,{GRADE},fps=30,format=yuv420p',
        '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', f'{P}/reel/public/clips/{out}', '-y'], check=True)
    clips.append(dict(file=out, start=a, end=b, src=f, inPoint=inp, zoom=zoom, trans=trans))
json.dump(clips, open(f'{P}/clips.json', 'w'), indent=1)
# voz: toma 1 (gancho) y toma final (CTA), ubicadas en la línea de tiempo
talk = [c for c in clips if c['src'] in ('C4498.MP4', 'C4499.MP4')]
inputs, filt = [], []
for k, c in enumerate(talk):
    inputs += ['-ss', str(c['inPoint']), '-t', f"{c['end']-c['start']:.3f}", '-i', f"{P}/raw/{c['src']}"]
    d = int(c['start'] * 1000)
    filt.append(f'[{k}:a]aformat=channel_layouts=mono,highpass=f=80,afftdn=nf=-25,afade=t=in:d=0.04,afade=t=out:st={c["end"]-c["start"]-0.06:.3f}:d=0.06,adelay={d}|{d}[v{k}]')
filt.append(''.join(f'[v{k}]' for k in range(len(talk))) + f'amix=inputs={len(talk)}:normalize=0[o]')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[o]',
                '-ar', '48000', f'{P}/audio/voz.wav', '-y'], check=True)
print(len(clips), 'tomas')
