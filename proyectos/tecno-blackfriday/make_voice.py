# v2: corta cada toma exactamente desde la primera palabra hasta el final de la última (alineacion.json),
# sin respiraciones previas ni voces del equipo. Arma edl_voz.tsv, words.json y audio/voz_raw.wav.
import json, subprocess
PRE, POST, FADE = 0.035, 0.09, 0.012
tomas = json.load(open('alineacion.json'))
t, rows, words = 0.0, [], []
for i, tm in enumerate(tomas):
    w = tm['words']; s0 = round(w[0]['start'] - PRE, 3); s1 = round(min(w[-1]['end'] + POST, tm['win'][1]), 3)
    rows.append((t, t + s1 - s0, tm['file'], s0, s1))
    for u in w:
        words.append(dict(text=u['text'], key=u['key'], seg=i, start=round(t + u['start'] - s0, 3), wend=round(t + u['end'] - s0, 3)))
    t += s1 - s0
for i, w in enumerate(words):  # cada palabra queda hasta que arranca la siguiente (máx. 0,35 s después de terminar)
    nxt = words[i + 1]['start'] if i + 1 < len(words) else t
    w['end'] = round(min(nxt, w['wend'] + 0.35), 3)
json.dump(words, open('words.json', 'w'), ensure_ascii=False, indent=1)
with open('edl_voz.tsv', 'w') as f:
    for a, b, n, s0, s1 in rows: f.write(f'{a:.3f}\t{b:.3f}\t{n}\t{s0}\t{s1}\n')
parts = []
for i, (a, b, n, s0, s1) in enumerate(rows):
    p = f'audio/seg{i:02d}.wav'; d = s1 - s0
    subprocess.run(['ffmpeg','-nostdin','-v','error','-ss',str(s0),'-t',f'{d:.3f}','-i',f'raw/{n}.MP4','-vn','-ac','1','-ar','48000',
        '-af',f'afade=t=in:d={FADE},afade=t=out:st={d-0.03:.3f}:d=0.03', p,'-y'], check=True); parts.append(p)
open('audio/concat.txt','w').write(''.join(f"file '{p.split('/')[-1]}'\n" for p in parts))
subprocess.run(['ffmpeg','-nostdin','-v','error','-f','concat','-safe','0','-i','audio/concat.txt','audio/voz_raw.wav','-y'], check=True)
print(open('edl_voz.tsv').read(), 'total', round(t, 2))
