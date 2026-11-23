# Ajusta los bordes de cada toma por energía, arma edl_voz.tsv y audio/voz_raw.wav (concat del audio original)
import wave, numpy as np, subprocess, sys
PAD_IN, PAD_OUT, TH = 0.10, 0.16, -30  # dB
def env(n):
    w = wave.open(f'audio/{n}.wav'); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    h = int(sr * 0.02); m = len(x) // h
    return 20 * np.log10(np.sqrt((x[:m*h].reshape(m, h) ** 2).mean(1)) + 1e-9)  # 20 ms
rows = [l.rstrip('\n').split('\t') for l in open('tomas.tsv') if not l.startswith('#')]
cache, out, t = {}, [], 0.0
for n, a, b, txt in rows:
    a, b = float(a), float(b); e = cache.setdefault(n, env(n))
    ia, ib = int(a / .02), min(int(b / .02), len(e) - 1)
    # primer/último cuadro con voz (3 cuadros seguidos sobre el umbral) dentro de la ventana
    on = [i for i in range(ia, ib - 3) if (e[i:i+3] > TH).all()]
    s0 = max(0, on[0] * .02 - PAD_IN); s1 = min(b, (on[-1] + 3) * .02 + PAD_OUT)
    out.append((n, round(s0, 2), round(s1, 2), txt)); 
with open('edl_voz.tsv', 'w') as f:
    for n, s0, s1, txt in out:
        f.write(f'{t:.2f}\t{t+s1-s0:.2f}\t{n}\t{s0}\t{s1}\t{txt}\n'); t += s1 - s0
print(open('edl_voz.tsv').read(), 'total', round(t, 2))
# concat con micro-fundidos de 15 ms (audio original estéreo 48k)
parts = []
for i, (n, s0, s1, _) in enumerate(out):
    p = f'audio/seg{i:02d}.wav'; d = s1 - s0
    subprocess.run(['ffmpeg','-nostdin','-v','error','-ss',str(s0),'-t',f'{d:.3f}','-i',f'raw/{n}.MP4','-vn','-ac','1','-ar','48000',
        '-af',f'afade=t=in:d=0.015,afade=t=out:st={d-0.015:.3f}:d=0.015', p,'-y'], check=True); parts.append(p)
open('audio/concat.txt','w').write(''.join(f"file '{p.split('/')[-1]}'\n" for p in parts))
subprocess.run(['ffmpeg','-nostdin','-v','error','-f','concat','-safe','0','-i','audio/concat.txt','audio/voz_raw.wav','-y'], check=True)
