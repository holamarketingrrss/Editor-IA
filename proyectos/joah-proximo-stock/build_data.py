# Junta clips.json + words.json en reel/src/data.json (zoom con salto en las tomas habladas)
import json, sys
P = sys.argv[1]
clips = json.load(open(f'{P}/clips.json')); words = json.load(open(f'{P}/words.json'))
for c in clips:
    if c['src'] == 'C4498.MP4': c['punch'] = 2.45; c['origin'] = '80% 32%'   # gancho: Bety entra por la derecha
    if c['src'] == 'C4499.MP4': c['punch'] = 15.37; c['origin'] = '50% 36%'  # CTA: salto en "Escribinos"
json.dump(dict(duration=20.5, outroAt=17.89, clips=clips, words=words), open(f'{P}/reel/src/data.json', 'w'), ensure_ascii=False, indent=1)
