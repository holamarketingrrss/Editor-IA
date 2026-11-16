# uso: python3 -I contact.py <proyecto>  -> sheets/sheet_NN.jpg con miniaturas numeradas
import sys, os, json, glob
from PIL import Image, ImageDraw, ImageFont
P = sys.argv[1]
inv = [l.rstrip('\n').split('\t') for l in open(f'{P}/inventario.tsv')]
rows = []
for parent, title, fid, size in inv:
    jp = f'{P}/thumbs/{fid}.jpg'
    if not os.path.exists(jp): continue
    meta = {}
    try: meta = json.load(open(f'{P}/thumbs/{fid}.json'))
    except Exception: pass
    st = (meta.get('streams') or [{}])[0]
    rot = 0
    for sd in st.get('side_data_list', []) or []:
        rot = sd.get('rotation', rot)
    dur = float((meta.get('format') or {}).get('duration', 0) or 0)
    rows.append(dict(parent=parent, title=title, id=fid, w=st.get('width'), h=st.get('height'), rot=rot, dur=dur))
os.makedirs(f'{P}/sheets', exist_ok=True)
with open(f'{P}/catalogo.tsv', 'w') as f:
    for i, r in enumerate(rows):
        f.write(f"{i}\t{r['title']}\t{r['id']}\t{r['w']}x{r['h']}\trot{r['rot']}\t{r['dur']:.1f}s\t{r['parent']}\n")
TW, TH, COLS, PER = 300, 200, 6, 36
font = ImageFont.load_default(size=22)
for s in range(0, len(rows), PER):
    chunk = rows[s:s+PER]
    sheet = Image.new('RGB', (COLS*TW, ((len(chunk)+COLS-1)//COLS)*TH), 'black')
    for j, r in enumerate(chunk):
        im = Image.open(f"{P}/thumbs/{r['id']}.jpg"); im.thumbnail((TW-4, TH-4))
        x, y = (j % COLS)*TW, (j//COLS)*TH
        sheet.paste(im, (x+(TW-im.width)//2, y+(TH-im.height)//2))
        d = ImageDraw.Draw(sheet)
        d.rectangle([x, y, x+120, y+28], fill='black')
        d.text((x+4, y+2), f"{s+j} {r['dur']:.0f}s", fill='yellow', font=font)
    sheet.save(f'{P}/sheets/sheet_{s//PER:02d}.jpg', quality=80)
print(len(rows), 'clips')
