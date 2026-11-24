# Extrae las tomas de Pri (sin corrección de color) y arma reel/src/data.json:
# segmentos, palabras con posición/animación, zooms (punch-in) y eventos de sonido.
import json, subprocess
segs = json.load(open('segs.json')); words = json.load(open('words.json'))
for s in segs:
    if s['kind'] != 'pri': continue
    s['clip'] = f"p{s['i']:02d}.mp4"
    subprocess.run(['ffmpeg','-nostdin','-v','error','-ss',str(s['s0']),'-t',f"{s['s1']-s['s0']+0.25:.3f}",'-i',f"raw/{s['file']}.MP4",
        '-vf','scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p','-an',
        '-c:v','libx264','-crf','15','-preset','fast','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',
        f"reel/public/clips/{s['clip']}",'-y'], check=True)
# posiciones de subtítulos (centro x,y) — derechos, en lugares distintos; nunca sobre la cara ni fuera de la zona segura
SLOT_PRI = [(540, 1290), (330, 1150), (760, 1420), (540, 1470), (780, 1160), (320, 1400), (560, 1210)]
SLOT_VO = [(540, 1360), (330, 430), (760, 1450), (540, 420), (300, 1430), (780, 430), (540, 1470), (320, 1360)]
ENTRY = ['left', 'up', 'right', 'down', 'zoom', 'right', 'up', 'left']
cnt = {'pri': 0, 'vo': 0}
for w in words:
    k = w['kind']; n = cnt[k]; cnt[k] += 1
    sl = (SLOT_PRI if k == 'pri' else SLOT_VO)[n % (7 if k == 'pri' else 8)]
    w['x'], w['y'], w['entry'] = sl[0], sl[1], ENTRY[(n * 3) % 8]
    if w['key'] and k == 'vo': w['y'] = 1390 if w['y'] > 900 else 450; w['x'] = 540  # las claves de la voz en off, centradas y grandes
# zooms en Pri: (tiempo, escala destino) con swoosh
PUNCH = {'¡Mirá esto!': 1.42, 'verificá': 1.34, 'Plan Canje': 1.36, 'fotos,': 1.3}
zooms = [dict(t=w['start'] - 0.06, to=PUNCH[w['text']], seg=w['seg']) for w in words if w['text'] in PUNCH]
sfx = []
for w in words:
    if w['key']: sfx.append(dict(t=round(w['start'], 3), f='click' if w['kind'] == 'pri' else 'blip', v=0.32 if w['kind'] == 'pri' else 0.26))
for z in zooms: sfx.append(dict(t=round(z['t'] - 0.12, 3), f='swoosh', v=0.4))
for s in segs[1:]: sfx.append(dict(t=round(s['start'] - 0.2, 3), f='swoosh', v=0.34))
end = segs[-1]['end']
sfx.append(dict(t=round(end - 0.15, 3), f='swoosh', v=0.4))
data = dict(duration=round(end + 2.3, 2), outroAt=round(end + 0.06, 3), segs=segs, words=words, zooms=zooms, sfx=sorted(sfx, key=lambda e: e['t']),
            hook=dict(end=2.9, tag='INICIO RÁPIDO', text='Estrenar iPhone sin empezar de cero'))
json.dump(data, open('reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print(len(sfx), 'sonidos;', len(zooms), 'zooms;', data['duration'], 's')
