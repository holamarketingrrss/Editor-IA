# uso: env.py <wav> <desde> <hasta> -> dB RMS cada 50 ms (un dígito: 0=-60dB .. 9=-15dB o más)
import sys, wave, numpy as np
w = wave.open(sys.argv[1]); sr = w.getframerate()
a, b = float(sys.argv[2]), float(sys.argv[3])
w.setpos(int(a*sr)); x = np.frombuffer(w.readframes(int((b-a)*sr)), np.int16).astype(float)/32768
h = int(sr*0.05); out = ''
for i in range(0, len(x)-h, h):
    db = 20*np.log10(np.sqrt(np.mean(x[i:i+h]**2))+1e-9); out += str(int(np.clip((db+60)/5, 0, 9)))
for i in range(0, len(out), 40): print(f'{a+i*0.05:6.2f} {out[i:i+40]}')
