# Realce de voz con IA (Resemble Enhance: denoise + dereverb + ancho de banda). uso: enhance.py in.wav out.wav [lambd]
import sys, torch, numpy as np, soundfile as sf
from resemble_enhance.enhancer.inference import denoise, enhance
a, sr = sf.read(sys.argv[1], dtype='float32'); a = a.mean(1) if a.ndim > 1 else a; x = torch.from_numpy(a)
lam = float(sys.argv[3]) if len(sys.argv) > 3 else 0.9
y, sr2 = enhance(x, sr, 'cpu', nfe=64, solver='midpoint', lambd=lam, tau=0.5)
sf.write(sys.argv[2], y.cpu().numpy(), sr2); print('ok', sr2, y.shape)
