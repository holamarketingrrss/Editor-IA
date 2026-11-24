# Alineación forzada (torchaudio MMS_FA) del texto de cada toma contra el audio original.
# Sale alineacion.json: por toma, cada palabra con inicio/fin en segundos del archivo crudo.
import json, unicodedata, re, subprocess, torch, torchaudio, numpy as np
from torchaudio.pipelines import MMS_FA as B
SPOKEN = {'center': 'senter', 'stage': 'esteich', 'selfie': 'selfi', 'wifi': 'uaifai', 'bluetooth': 'blutuz', 'whatsapp': 'guatsap', 'black': 'blak', 'friday': 'fraidei', 'iphone': 'aifon', '18': 'dieciocho', 'reel': 'ril', 'max': 'maks'}
def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    w = re.sub(r'[^a-z0-9]', '', w); w = SPOKEN.get(w, w); return w.replace('j', 'j')
model = B.get_model(); tok = B.get_tokenizer(); aligner = B.get_aligner()
out = []
for line in open('tomas.tsv'):
    if line.startswith('#'): continue
    n, a, b, kind, txt = line.rstrip('\n').split('\t'); a, b = float(a), float(b)
    raw = subprocess.run(['ffmpeg','-nostdin','-v','error','-ss',str(a),'-t',str(b-a),'-i',f'raw/{n}','-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
    wav = torch.from_numpy(np.frombuffer(raw, np.int16).astype(np.float32) / 32768).unsqueeze(0)
    disp = [(t.startswith('*'), p) for t in txt.split() for p in [t.lstrip('*')] ]
    words = []  # (texto mostrado, clave, palabra hablada)
    for key, t in disp:
        parts = t.split('_')
        for j, p in enumerate(parts): words.append((t.replace('_', ' '), key, norm(p), j == 0, len(parts)))
    with torch.inference_mode():
        em, _ = model(wav); spans = aligner(em[0], tok([w[2] for w in words]))
    r = wav.shape[1] / em.shape[1] / 16000
    ws = [dict(spoken=w[2], start=round(a + s[0].start * r, 3), end=round(a + s[-1].end * r, 3),
               score=round(float(np.mean([x.score for x in s])), 2)) for w, s in zip(words, spans)]
    # agrupo las palabras unidas con _ en una sola unidad de subtítulo
    units, i = [], 0
    for key, t in disp:
        k = len(t.split('_')); g = ws[i:i+k]; i += k
        units.append(dict(text=t.replace('_', ' '), key=key, start=g[0]['start'], end=g[-1]['end'], score=min(x['score'] for x in g)))
    out.append(dict(file=n, win=[a, b], kind=kind, words=units))
    print(n, ' '.join(f"{u['text']}({u['start']:.2f}-{u['end']:.2f}|{u['score']})" for u in units))
json.dump(out, open('alineacion.json', 'w'), ensure_ascii=False, indent=1)
