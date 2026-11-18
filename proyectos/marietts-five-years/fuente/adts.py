# Junta los chunks de audio del MP4 en un stream ADTS (AAC-LC 48 kHz estéreo)
import json, sys, os
j=json.load(open('audio_index.json')); sizes=j['sizes']; out=open(sys.argv[1],'wb'); si=0; miss=0
for i,(off,n,spc) in enumerate(j['chunks']):
    p=f'ach/{i:05d}'
    if not os.path.exists(p) or os.path.getsize(p)!=n:
        miss+=1; si+=spc; continue
    d=open(p,'rb').read(); o=0
    for k in range(spc):
        s=sizes[si+k]; fl=s+7
        h=bytes([0xFF,0xF1,(1<<6)|(3<<2)|(2>>2),((2&3)<<6)|(fl>>11),(fl>>3)&0xFF,((fl&7)<<5)|0x1F,0xFC])
        out.write(h+d[o:o+s]); o+=s
    si+=spc
print('missing chunks',miss)
