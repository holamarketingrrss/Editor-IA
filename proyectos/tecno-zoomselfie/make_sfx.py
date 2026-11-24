# Efectos sutiles sintetizados (sin licencias): click, blip tecnológico, swoosh, pop
import numpy as np, wave
SR = 48000
def save(name, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    w = wave.open(f'reel/public/sfx/{name}.wav', 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
t = lambda d: np.arange(int(SR * d)) / SR
rng = np.random.default_rng(3)
# click: tick corto de 2 capas (transitorio + tono agudo que decae rápido)
x = t(0.06); click = np.sin(2*np.pi*3200*x) * np.exp(-x*140) + 0.6*rng.standard_normal(len(x)) * np.exp(-x*400)
save('click', click)
# blip: barrido ascendente suave, tipo interfaz
x = t(0.14); f = 900 + 1800 * (x / x[-1]) ** 0.6
blip = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-x*22) * (1 - np.exp(-x*900))
blip += 0.35*np.sin(2*np.pi*np.cumsum(f*2)/SR) * np.exp(-x*35)
save('blip', blip)
# swoosh: ruido filtrado con barrido de banda y envolvente de campana
x = t(0.42); n = rng.standard_normal(len(x))
from numpy.fft import rfft, irfft
out = np.zeros_like(n); hop = 512
for i in range(0, len(n) - 2048, hop):
    seg = n[i:i+2048] * np.hanning(2048); S = rfft(seg); fr = np.fft.rfftfreq(2048, 1/SR)
    c = 500 + 5000 * (i / len(n)); S *= np.exp(-((fr - c) / (c * 0.6)) ** 2)
    out[i:i+2048] += irfft(S)
env = np.sin(np.pi * np.clip(x / x[-1], 0, 1)) ** 2.2
save('swoosh', out * env)
# pop: burbuja corta para palabras en pantallas de color
x = t(0.09); f = 380 + 900 * np.exp(-x*40)
save('pop', np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-x*45))
print('ok')
