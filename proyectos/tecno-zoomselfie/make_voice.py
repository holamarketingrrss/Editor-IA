# Arma la voz: cortes justos por palabra (alineacion.json), pausas largas acortadas, respiraciones
# atenuadas -24 dB en cada hueco entre palabras, cadena "podcast" y -14 LUFS.
import json, subprocess, wave, numpy as np
SR = 48000; PRE, POST = 0.03, 0.08; MAXGAP, KEEPGAP, SEGGAP = 0.40, 0.20, 0.08
al = json.load(open('alineacion.json'))
# (toma, primera palabra, última palabra+1, corte final forzado)
PIECES = [(0, 8, None, 7.10), (1, 0, None, None), (2, 0, 7, 4.15), (2, 12, None, None)]
LABEL = {'por uno': '1x', 'por cuatro': '4x', 'por ocho': '8x'}
def load(n):
    raw = subprocess.run(['ffmpeg','-nostdin','-v','error','-i',f'raw/{n}','-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768
out, words, segs, t = [], [], [], 0.0
for pi, (ti, a, b, hard_end) in enumerate(PIECES):
    tm = al[ti]; x = load(tm['file']); ws = tm['words'][a:b]
    # sub-bloques separados por pausas largas
    blocks, cur = [], [ws[0]]
    for w in ws[1:]:
        if w['start'] - cur[-1]['end'] > MAXGAP: blocks.append(cur); cur = [w]
        else: cur.append(w)
    blocks.append(cur)
    seg_start = t
    for bi, bl in enumerate(blocks):
        s0 = bl[0]['start'] - PRE; s1 = bl[-1]['end'] + POST
        if hard_end and bi == len(blocks) - 1: s1 = min(s1, hard_end) if hard_end > bl[-1]['end'] else hard_end
        y = x[int(s0*SR):int(s1*SR)].copy()
        # atenuar huecos internos (respiraciones) con rampas de 15 ms
        g = np.ones(len(y)); r = int(0.015*SR)
        for w1, w2 in zip(bl, bl[1:]):
            g0, g1 = int((w1['end'] + 0.03 - s0)*SR), int((w2['start'] - 0.03 - s0)*SR)
            if g1 - g0 > 2*r: g[g0:g1] = 0.063; g[g0:g0+r] = np.linspace(1, .063, r); g[g1-r:g1] = np.linspace(.063, 1, r)
        y *= g; f = int(0.012*SR); y[:f] *= np.linspace(0,1,f); y[-int(.03*SR):] *= np.linspace(1,0,int(.03*SR))
        for w in bl:
            words.append(dict(text=LABEL.get(w['text'].rstrip('.,'), w['text']), key=w['key'], seg=pi, kind=tm['kind'],
                              start=round(t + w['start'] - s0, 3), wend=round(t + w['end'] - s0, 3)))
        out.append(y); t += len(y)/SR
        gap = KEEPGAP if bi < len(blocks) - 1 else SEGGAP + (0.45 if pi == 1 else 0)
        out.append(np.zeros(int(gap*SR))); t += gap
    segs.append(dict(i=pi, file=tm['file'], kind=tm['kind'], start=round(seg_start, 3), end=round(t - SEGGAP - (0.45 if pi == 1 else 0), 3),
                     s0=round(ws[0]['start'] - PRE, 3), s1=hard_end))
for k, w in enumerate(words):
    nxt = words[k+1]['start'] if k+1 < len(words) else t
    w['end'] = round(min(nxt, w['wend'] + 0.35), 3)
y = np.concatenate(out); wv = wave.open('audio/voz_raw.wav','w'); wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR)
wv.writeframes((np.clip(y,-1,1)*32767).astype(np.int16).tobytes()); wv.close()
json.dump(words, open('words.json','w'), ensure_ascii=False, indent=1); json.dump(segs, open('segs.json','w'), ensure_ascii=False, indent=1)
POD = ('highpass=f=80,afftdn=nr=12:nf=-44:tn=1,deesser=i=0.5:m=0.5:f=0.5,'
       'acompressor=threshold=-24dB:ratio=4:attack=5:release=90:makeup=4,'
       'equalizer=f=120:t=h:w=0.7:g=2.5,equalizer=f=320:t=q:w=1.2:g=-2.5,equalizer=f=3500:t=q:w=1.4:g=3,'
       'equalizer=f=10000:t=h:w=0.7:g=2,alimiter=limit=0.89')
subprocess.run(['ffmpeg','-nostdin','-v','error','-i','audio/voz_raw.wav','-af',POD,'audio/voz_pod.wav','-y'], check=True)
j = subprocess.run(['ffmpeg','-nostdin','-i','audio/voz_pod.wav','-af','loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True).stderr
d = json.loads(j[j.rindex('{'):j.rindex('}')+1])
ln = f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true"
subprocess.run(['ffmpeg','-nostdin','-v','error','-i','audio/voz_pod.wav','-af',ln+',aresample=48000','-ar','48000','audio/voz.wav','-y'], check=True)
for s in segs: print(s)
print(' '.join(f"{w['text']}@{w['start']}" for w in words)); print('total', round(t, 2))
