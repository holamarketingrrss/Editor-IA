# Arma reel/src/data.json: segmentos, palabras con posición/entrada, tomas del mockup, sonidos.
import json
segs = json.load(open('segs.json')); words = json.load(open('words.json'))
SLOT_PRI = [(330, 1180), (760, 1300), (300, 1330), (780, 1170), (540, 1240)]
SLOT_VO = [(330, 300), (760, 320), (540, 290), (300, 330), (780, 300)]   # arriba del mockup
ENTRY = ['left', 'up', 'right', 'down', 'zoom', 'right', 'up', 'left']
KEY_POS = (540, 1440)   # claves: siempre centradas abajo
c = {'pri': 0, 'vo': 0}
for w in words:
    k = w['kind']; n = c[k]; c[k] += 1
    sl = (SLOT_PRI if k == 'pri' else SLOT_VO)[n % 5]
    w['x'], w['y'] = KEY_POS if w['key'] else sl
    w['entry'] = ENTRY[(n * 3) % 8]
voice_end = segs[-1]['end']
vo1, vo2 = segs[1], segs[2]
mock = {
  'zoom': dict(start=vo1['start'], end=vo2['start'], shots=[(vo1['start'], 6.4, 1), (7.35, 12.6, 1), (8.66, 15.35, 1)]),
  'selfie': dict(start=vo2['start'], end=round(voice_end + 0.08, 3), shots=[(vo2['start'], 0.0, 0.6), (11.9, 1.25, 1)]),
}
zchips = [dict(label=w['text'], t=w['start']) for w in words if w['text'] in ('1x', '4x', '8x')]
endcard = dict(start=round(voice_end + 0.08, 3), dur=4.4)
outro = round(endcard['start'] + endcard['dur'], 3)
sfx = [dict(t=w['start'], f='click' if w['kind'] == 'pri' else 'blip', v=0.3) for w in words if w['key']]
sfx += [dict(t=round(s['start'] - 0.2, 3), f='swoosh', v=0.34) for s in (segs[1], segs[2])]
E = endcard['start']
sfx += [dict(t=round(E - 0.15, 3), f='swoosh', v=0.38), dict(t=round(E + 0.25, 3), f='pop', v=0.35), dict(t=round(E + 0.9, 3), f='click', v=0.3),
        dict(t=round(E + 1.2, 3), f='click', v=0.3), dict(t=round(E + 2.1, 3), f='blip', v=0.3), dict(t=round(outro - 0.15, 3), f='swoosh', v=0.4)]
data = dict(duration=round(outro + 2.3, 2), outroAt=outro, segs=segs, words=words, mock=mock, zchips=zchips, endcard=endcard,
            sfx=sorted(sfx, key=lambda e: e['t']), hook=dict(end=2.4, tag='2 PRUEBAS', text='en el parque, sin tecnicismos'),
            pri0=dict(clip='pri0.mp4', cut='pri0_cut.webm', startFrom=5), pri1=dict(clip='pri1.mp4', cut='pri1_cut.webm', startFrom=0))
json.dump(data, open('reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print(data['duration'], zchips)
