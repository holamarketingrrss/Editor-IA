# Corta cada toma desde la primera palabra hasta el final de la última (alineacion.json), sin respiraciones
# ni voces del equipo; arma edl_voz.tsv, words.json y audio/voz.wav con cadena "podcast" y -14 LUFS.
import json, subprocess
PRE, POST, GAP = 0.035, 0.09, 0.06
SKIP = {7: 3, 8: 1}            # toma 7: arranca en "Que" ; toma 8: sin "Entonces"
CUT = {1: (None, 5.985), 2: (5.975, None)}  # frontera ajustada a mano (sin pausa entre «usás» y «Asegurate»)
FACE = {0: (465, 650), 6: (531, 545), 7: (600, 600), 8: (540, 545)}  # centro de cara (px en 1080x1920)
tomas = json.load(open('alineacion.json'))
t, rows, words = 0.0, [], []
for i, tm in enumerate(tomas):
    w = tm['words'][SKIP.get(i, 0):]
    s0 = round(w[0]['start'] - PRE, 3); s1 = round(min(w[-1]['end'] + POST, tm['win'][1]), 3)
    s0 = CUT.get(i, (None, None))[0] or s0; s1 = CUT.get(i, (None, None))[1] or s1
    rows.append(dict(i=i, start=round(t, 3), end=round(t + s1 - s0, 3), file=tm['file'], s0=s0, s1=s1, kind=tm['kind'], face=FACE.get(i)))
    for u in w:
        words.append(dict(text=u['text'], key=u['key'], seg=i, kind=tm['kind'], start=round(t + u['start'] - s0, 3), wend=round(t + u['end'] - s0, 3)))
    t += s1 - s0 + GAP
for k, w in enumerate(words):
    nxt = words[k + 1]['start'] if k + 1 < len(words) else t
    w['end'] = round(min(nxt, w['wend'] + 0.35), 3)
json.dump(words, open('words.json', 'w'), ensure_ascii=False, indent=1)
json.dump(rows, open('segs.json', 'w'), ensure_ascii=False, indent=1)
POD = ('highpass=f=80,afftdn=nr=12:nf=-44:tn=1,deesser=i=0.5:m=0.5:f=0.5,'
       'acompressor=threshold=-24dB:ratio=4:attack=5:release=90:makeup=4,'
       'equalizer=f=120:t=h:w=0.7:g=2.5,equalizer=f=320:t=q:w=1.2:g=-2.5,equalizer=f=3500:t=q:w=1.4:g=3,'
       'equalizer=f=10000:t=h:w=0.7:g=2,alimiter=limit=0.89')
parts = []
for r in rows:
    p = f"audio/seg{r['i']:02d}.wav"; d = r['s1'] - r['s0']
    subprocess.run(['ffmpeg','-nostdin','-v','error','-ss',str(r['s0']),'-t',f'{d:.3f}','-i',f"raw/{r['file']}.MP4",'-vn','-ac','1','-ar','48000',
        '-af',f"afade=t=in:d=0.012,afade=t=out:st={d-0.03:.3f}:d=0.03,apad=pad_dur={GAP}", p,'-y'], check=True); parts.append(p)
open('audio/concat.txt','w').write(''.join(f"file '{p.split('/')[-1]}'\n" for p in parts))
subprocess.run(['ffmpeg','-nostdin','-v','error','-f','concat','-safe','0','-i','audio/concat.txt','-af',POD,'audio/voz_pod.wav','-y'], check=True)
j = subprocess.run(['ffmpeg','-nostdin','-i','audio/voz_pod.wav','-af','loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True).stderr
d = json.loads(j[j.rindex('{'):j.rindex('}')+1])
ln = f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true"
subprocess.run(['ffmpeg','-nostdin','-v','error','-i','audio/voz_pod.wav','-af',ln+',aresample=48000','-ar','48000','reel/public/voz.wav','-y'], check=True)
for r in rows: print(r['i'], r['kind'], r['start'], r['end'], r['file'], r['s0'], r['s1'])
print('total', round(t, 2))
