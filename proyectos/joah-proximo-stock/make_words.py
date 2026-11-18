# Subtítulos palabra por palabra. Voz (gancho y CTA): tiempos de whisper.cpp ajustados a la energía del audio.
# Beneficios (sin voz, b-roll): repartidos sobre los cortes al beat. Texto del guion de Notion.
import json, sys
P = sys.argv[1]
W, OL = '#FFFFFF', '#A9C483'   # blanco + verde oliva claro (derivado del #517054 de marca, legible sobre fondo)
# estilos Montserrat: (peso, itálica, mayúsculas, tamaño)
ST = {
  'reg':  (600, False, False, 104),
  'lite': (500, True,  False, 116),
  'caps': (800, False, True,  96),
  'med':  (500, False, False, 110),
  'HIW':  (900, False, True,  150),   # destacada blanca
  'HIO':  (900, True,  True,  160),   # destacada oliva itálica
  'HIO2': (800, True,  False, 150),   # destacada oliva itálica minúscula
}
def w(text, a, b, st, color=None):
    wt, it, up, size = ST[st]
    if color is None: color = OL if st.startswith('HIO') else W
    return dict(text=text, start=a, end=b, weight=wt, italic=it, upper=up, size=size, color=color, hi=st.startswith('HI'))

def spread(items, a, b):
    n = len(items); d = (b - a) / n
    return [w(t, round(a + i*d, 3), round(a + (i+1)*d, 3), st) for i, (t, st) in enumerate(items)]

words = []
# GANCHO (voz, 0–4.07)
hook = [('Si',0.05,'reg'),('vendés',0.30,'caps'),('ropa',0.85,'HIO'),('en',1.25,'lite'),('20',1.40,'HIW'),
        ('segundos',1.70,'HIO2'),('te',2.45,'reg'),('muestro',2.60,'caps'),('tu',3.12,'lite'),('próximo',3.22,'med'),('stock',3.76,'HIO')]
for i,(t,a,st) in enumerate(hook):
    b = hook[i+1][1] if i+1 < len(hook) else 4.07
    words.append(w(t, a, b, st))
# BENEFICIOS (sin voz)
words += spread([('Estampas','HIO'),('para','lite'),('todos','reg'),('los','lite'),('estilos','HIW')], 4.07, 5.99)
words += spread([('Colores','HIW'),('que','lite'),('combinan','caps'),('con','reg'),('todo','HIO')], 5.99, 8.39)
words += spread([('Algodón','HIO'),('y','lite'),('buen','reg'),('calce','HIW')], 8.39, 10.31)
words += spread([('Y','reg'),('precio','HIO'),('pensado','caps'),('para','lite'),('que','reg'),('te','lite'),('quede','med'),('margen','HIW')], 10.31, 13.19)
# CTA (voz, 13.19–17.89)
cta = [('Armá',13.30,'caps'),('tu',13.52,'lite'),('pedido',13.64,'HIO'),('y',14.10,'lite'),('empezá',14.17,'reg'),('a',14.62,'lite'),
       ('vender',14.70,'HIW'),('Escribinos',15.37,'caps'),('por',15.74,'lite'),('WhatsApp',15.84,'HIO2'),('y',16.23,'lite'),('te',16.29,'reg'),
       ('pasamos',16.42,'med'),('el',16.87,'lite'),('catálogo',16.99,'caps'),('mayorista',17.33,'HIO')]
for i,(t,a,st) in enumerate(cta):
    b = cta[i+1][1] if i+1 < len(cta) else 17.89
    words.append(w(t, a, b, st))
json.dump(words, open(f'{P}/words.json','w'), ensure_ascii=False, indent=1)
print(len(words), 'palabras')
