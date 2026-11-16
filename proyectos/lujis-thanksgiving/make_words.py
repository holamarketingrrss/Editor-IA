# Genera words.json: una palabra a la vez, en distintas posiciones del recuadro seguro,
# alternando las tipografías del design system de LUJI'S.
import json, sys

P = sys.argv[1]
tr = json.load(open(f'{P}/audio/voz.json'))['transcription']
segs = [(s['offsets']['from'] / 1000, s['offsets']['to'] / 1000, s['text'].strip()) for s in tr if s['text'].strip()]

# Texto del guion (corrige lo que Whisper escuchó distinto)
GUION = ["Nosotras", "sabemos", "cómo", "poder", "festejar", "tu", "próximo", "Thanksgiving", "pero", "con",
         "una", "versión", "argentina", "Pedí", "antes", "del", "jueves", "y", "disfrutá", "Acción", "de",
         "Gracias", "de", "la", "mejor", "manera"]
assert len(GUION) == len(segs), (len(GUION), len(segs))

W, AMA, NAR, ROJ = '#FFFFFF', '#DFAD12', '#EE4D0B', '#DD0A0A'
# fuente, color, tamaño objetivo, x, y, rotación   (recuadro seguro: x 120-960, y 430-1400)
STYLE = [
    ('K', W,   170, 400, 560, -6),   # Nosotras
    ('G', W,   260, 680, 980, 3),    # sabemos
    ('S', W,   130, 330, 1250, -4),  # cómo
    ('B', W,   230, 720, 640, 5),    # poder
    ('K', AMA, 190, 470, 1050, -5),  # festejar
    ('S', W,   150, 760, 1300, 6),   # tu
    ('G', W,   250, 380, 760, -3),   # próximo
    ('B', AMA, 300, 540, 1010, -4),  # Thanksgiving
    ('S', W,   120, 720, 560, 4),    # pero
    ('K', W,   180, 330, 1260, -8),  # con
    ('G', W,   250, 740, 860, 5),    # una
    ('B', W,   220, 400, 600, -3),   # versión
    ('K', AMA, 210, 540, 640, -6),   # argentina
    ('G', W,   330, 360, 700, -4),   # Pedí
    ('S', W,   120, 700, 1180, 3),   # antes
    ('B', W,   200, 760, 560, 6),    # del
    ('G', ROJ, 300, 470, 1290, -5),  # jueves
    ('K', W,   220, 800, 1290, 8),   # y
    ('K', W,   180, 520, 650, -5),   # disfrutá
    ('G', W,   280, 380, 430, -3),   # Acción
    ('S', W,   120, 800, 1000, 5),   # de
    ('K', AMA, 220, 560, 1440, -6),  # Gracias
    ('S', W,   110, 300, 560, -5),   # de
    ('B', W,   200, 760, 1240, 4),   # la
    ('G', NAR, 320, 520, 840, -4),   # mejor
    ('K', W,   190, 540, 1180, -4),  # manera
]
RATIO = {'G': 0.33, 'B': 0.37, 'S': 0.62, 'K': 0.48}  # ancho aprox. por carácter (em)
MAXW = 900

words = []
for i, ((a, b, _), text, st) in enumerate(zip(segs, GUION, STYLE)):
    font, color, size, x, y, rot = st
    width = len(text) * RATIO[font] * size
    if width > MAXW:
        size = int(MAXW / (len(text) * RATIO[font])); width = MAXW
    half = width / 2
    x = max(70 + half, min(1010 - half, x))
    end = segs[i + 1][0] if i + 1 < len(segs) else b + 0.35
    words.append(dict(text=text, start=round(a, 3), end=round(end, 3), font=font, color=color,
                      size=size, x=int(x), y=y, rot=rot))
words[-1]['hold'] = False
json.dump(words, open(f'{P}/words.json', 'w'), ensure_ascii=False, indent=1)
print(len(words), 'palabras')
