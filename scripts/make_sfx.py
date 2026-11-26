#!/usr/bin/env python3
# Efectos de sonido sutiles, sintetizados (sin licencias): click y blip para palabras clave, swoosh para zooms.
# uso: python3 scripts/make_sfx.py [carpeta]      (por defecto template/reel/public/sfx; los proyectos los copian de ahí)
import os, sys, wave
import numpy as np

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../template/reel/public/sfx')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(3)
t = lambda d: np.arange(int(SR * d)) / SR


def guardar(nombre, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    with wave.open(os.path.join(OUT, f'{nombre}.wav'), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


# click: tick corto (transitorio + tono agudo que se apaga enseguida)
x = t(0.06)
guardar('click', np.sin(2 * np.pi * 3200 * x) * np.exp(-x * 140) + 0.6 * rng.standard_normal(len(x)) * np.exp(-x * 400))
# blip: barrido ascendente suave, tipo interfaz (tecnología)
x = t(0.14); f = 900 + 1800 * (x / x[-1]) ** 0.6
blip = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22) * (1 - np.exp(-x * 900))
guardar('blip', blip + 0.35 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * np.exp(-x * 35))
# swoosh: ruido con barrido de banda y envolvente de campana (zoom)
x = t(0.42); n = rng.standard_normal(len(x)); out = np.zeros_like(n); hop = 512
fr = np.fft.rfftfreq(2048, 1 / SR)
for i in range(0, len(n) - 2048, hop):
    S = np.fft.rfft(n[i:i + 2048] * np.hanning(2048)); c = 500 + 5000 * (i / len(n))
    out[i:i + 2048] += np.fft.irfft(S * np.exp(-((fr - c) / (c * 0.6)) ** 2))
guardar('swoosh', out * np.sin(np.pi * np.clip(x / x[-1], 0, 1)) ** 2.2)
print('sfx:', ', '.join(sorted(f for f in os.listdir(OUT) if f.endswith('.wav'))))
