# Arma reel/src/data.json: tomas + subtítulos (inglés palabra a palabra, clave en The Seasons itálica) + traducción al español.
import json, sys, re
P = sys.argv[1]
W = [(s['offsets']['from'] / 1000, s['offsets']['to'] / 1000, s['text'].strip())
     for s in json.load(open(f'{P}/audio/edit.json'))['transcription'] if s['text'].strip()]
clips = json.load(open(f'{P}/clips.json'))
END = clips[-1]['end']; OUTRO = 3.0
CARD = (5.30, clips[0]['end'])
# texto corregido, palabras clave entre *asteriscos*, rango en el que buscar los tiempos de Whisper, traducción
G = [
 ("Mariett's in *five* *years*", 0.0, 2.6, "¿Cómo ven Mariett's en cinco años?"),
 ("Yeah man, you're gonna make me *cry,* bro.", 2.6, 5.3, "Me vas a hacer llorar."),
 ("We could *easily* sit here and say,", 6.9, 9.05, "Fácilmente podríamos decir:"),
 ("yes, in five years we'll have a *coffee* *shop*", 9.05, 11.45, "«en cinco años tendremos una cafetería»"),
 ("or in five years we'll have *50* *carts.*", 11.45, 14.33, "«o en cinco años tendremos 50 carritos»."),
 ("But one thing that I think", 14.33, 16.10, "Pero algo que creo"),
 ("and I *pray* that in five years we're still doing is", 16.10, 19.30, "y pido que lo que sigamos haciendo en cinco años"),
 ("that we can still *serve* *people.*", 19.30, 21.68, "sea poder servir a la gente."),
 ("I see our marriage being of *constant* *service.*", 21.68, 25.6, "Veo nuestro matrimonio como un servicio constante."),
 ("Okay, but don't *steal* the stuff from me.", 25.6, 28.75, "Ok, pero no me robes lo que iba a decir."),
 ("Let me *talk.*", 28.75, 29.95, "Déjame hablar."),
 ("I would love to have a *podcast,*", 29.95, 31.58, "Me encantaría tener un podcast,"),
 ("maybe have some *retreats* with married couples", 31.58, 34.62, "quizás hacer retiros con matrimonios"),
 ("and *impact* their lives.", 34.62, 36.30, "e impactar sus vidas."),
 ("You know, *grace* has been given to us.", 36.30, 38.18, "La gracia nos fue dada."),
 ("We shall *give* *grace* to other people.", 38.18, 40.78, "Debemos dar gracia a otros."),
 ("That's right.", 40.78, END, "Así es."),
]
def kind_at(t):
    for c in clips:
        if c['start'] <= t < c['end']: return c['kind']
    return clips[-1]['kind']
cuts = [c['start'] for c in clips]
Y = {'W2': 520, 'W': 560, 'H': 560, 'H2': 520, 'E': 470}
caps = []
for text, lo, hi, tr in G:
    ws = [w for w in W if lo <= w[0] < hi]
    toks = text.split()
    times = [w[0] for w in ws]
    # reparte los tiempos de Whisper sobre las palabras corregidas (misma cantidad o interpolado)
    if len(times) != len(toks):
        a, b = (times[0], ws[-1][1]) if ws else (lo, hi)
        times = [a + (b - a) * i / len(toks) for i in range(len(toks))]
    start = times[0]
    for c in cuts:  # si arranca justo antes de un corte, que entre con la toma nueva
        if 0 < c - start < 0.3: start = c
    words = [dict(t=round(max(t, start), 3), text=tk.strip('*'), em=tk.startswith('*')) for t, tk in zip(times, toks)]
    caps.append(dict(start=round(start, 3), words=words, tr=tr))
for i, c in enumerate(caps):
    nxt = caps[i + 1]['start'] if i + 1 < len(caps) else END
    c['end'] = round(min(nxt, CARD[0]) if c['start'] < CARD[0] else nxt, 3)
    k = kind_at((c['start'] + c['end']) / 2)
    if k == 'S': c.update(band=True, y=960)
    else: c['y'] = Y[k]
data = dict(duration=round(END + OUTRO, 2), intro=dict(end=CARD[0]), card=dict(start=CARD[0], end=CARD[1],
            title="Mariett's in five years", sub="¿Cómo ven Mariett's en cinco años?"),
            overlays=dict(start=CARD[1], end=END), outro=dict(start=END, title='Full episode on YouTube', sub='LINK IN BIO'),
            clips=[dict(file=c['file'], start=c['start'], end=c['end'], kind=c['kind']) for c in clips], captions=caps)
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
for c in caps: print(f"{c['start']:6.2f}-{c['end']:6.2f} y={c['y']} {'band' if c.get('band') else ''} {' '.join(w['text'] for w in c['words'])}")

# --- Contraste: mide la luz debajo de cada texto en el cuadro real y elige moss (fondo claro) o ivory (fondo oscuro)
import subprocess, numpy as np
def frame(c, t):
    raw = subprocess.run(['ffmpeg', '-v', 'fatal', '-ss', f'{t:.2f}', '-i', f'{P}/reel/public/clips/{c["file"]}', '-frames:v', '1',
                          '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920, 1080)
def lum(img, x0, y0, x1, y1): return float(np.percentile(img[y0:y1, x0:x1], 35))
data = json.load(open(f'{P}/reel/src/data.json'))
for c in data['clips']:
    img = frame(c, (c['end'] - c['start']) / 2)
    c['ovBottom'] = 'dark' if lum(img, 620, 1405, 1000, 1495) < 125 else 'light'
    c['ovTop'] = 'dark' if lum(img, 300, 225, 780, 280) < 125 else 'light'
for cap in data['captions']:
    if cap.get('band'): continue
    cl = next(c for c in data['clips'] if c['start'] <= cap['start'] < c['end'])
    img = frame(cl, max(0.05, cap['start'] - cl['start'] + 0.1))
    cap['dark'] = lum(img, 120, cap['y'] - 90, 960, cap['y'] + 90) < 125
json.dump(data, open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
print([(c['file'], c['ovTop'], c['ovBottom']) for c in data['clips']])
print([c['words'][0]['text'] for c in data['captions'] if c.get('dark')])
