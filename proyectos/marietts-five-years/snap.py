# Ajusta cortes al mínimo de energía cercano (ventanas de 20 ms) para no cortar sílabas
import sys, numpy as np, subprocess
P = sys.argv[1]
raw = subprocess.run(['ffmpeg','-v','error','-i',f'{P}/audio/full16k.wav','-f','s16le','-ac','1','-ar','16000','-'],capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float32)
hop = 320; n = len(x)//hop
rms = np.sqrt((x[:n*hop].reshape(n,hop)**2).mean(1)); db = 20*np.log10(rms+1)
def snap(t, w=0.3):
    a, b = int((t-w)*50), int((t+w)*50)
    i = a + int(np.argmin(np.convolve(db[a:b], np.ones(3)/3, 'same')))
    return round(i/50, 2), round(float(db[i]),1)
for t in map(float, sys.argv[2:]): print(t, *snap(t))
if '--env' in sys.argv[1:]: pass
