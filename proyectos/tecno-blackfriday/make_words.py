# Genera words.json: una palabra (o grupo corto) a la vez, con el texto del guion grabado.
# Tiempos: whisper por toma (audio/w<i>.json) sobre la voz final; la toma 6 se toma del archivo original.
import json
segs = [l.rstrip('\n').split('\t') for l in open('edl_voz.tsv')]
def times(i):
    a = float(segs[i][0])
    if i == 6:  # whisper alucina en el corte aislado: uso los tiempos del archivo crudo
        src0 = float(segs[i][3]); t = json.load(open('audio/C4670.json'))['transcription']
        return [a + s['offsets']['from'] / 1000 - src0 for s in t if s['text'].strip()]
    t = json.load(open(f'audio/w{i}.json'))['transcription']
    return [a + s['offsets']['from'] / 1000 for s in t if s['text'].strip()]
# texto por toma; '*' = palabra clave (más grande, verde, con brillo); '_' une palabras que se muestran juntas
GUION = [
    "Es *Black_Friday y estabas esperando para cambiar el *celu. Este es el *momento para hacerlo.",
    "En *TECNO siempre buscamos ofrecerte distintas *opciones.",
    "Pero lo más importante es elegir el modelo *correcto para *vos.",
    "Si priorizás un diseño pequeño y *liviano, podemos ofrecerte el *iPhone_18_Pro.",
    "Y si creás *contenido y necesitás una pantalla más *grande, el *18_Pro_Max es para vos.",
    "Y si ya tenés un *iPhone y querés *cotizarlo, consultanos también por el *Plan_Canje.",
    "*Comentá este *reel y te pasamos las opciones *disponibles.",
]
words = []
for i, line in enumerate(GUION):
    ts = times(i); toks = line.split(); k = 0
    assert sum(len(t.split('_')) for t in toks) == len(ts), (i, len(ts), sum(len(t.split('_')) for t in toks))
    for t in toks:
        key = t.startswith('*'); parts = t.lstrip('*').split('_')
        words.append(dict(text=' '.join(parts), start=round(max(0, ts[k] - 0.05), 3), key=key, seg=i)); k += len(parts)
for i, w in enumerate(words):
    nxt = words[i + 1]['start'] if i + 1 < len(words) else float(segs[-1][1])
    w['end'] = round(nxt, 3)
    if w['end'] - w['start'] > 0.9: w['end'] = round(w['start'] + 0.9, 3)  # no dejar palabras colgadas en pausas
json.dump(words, open('words.json', 'w'), ensure_ascii=False, indent=1)
print(len(words), 'palabras;', ' '.join(f"{w['text']}@{w['start']}" for w in words if w['key']))
