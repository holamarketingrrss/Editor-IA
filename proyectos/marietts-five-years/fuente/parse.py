import struct, json, sys
d=open(sys.argv[1],'rb').read()
def boxes(o,end):
    while o<end:
        sz,t=struct.unpack('>I4s',d[o:o+8]); h=8
        if sz==1: sz=struct.unpack('>Q',d[o+8:o+16])[0]; h=16
        yield t.decode('latin1'),o+h,o+sz; o+=sz
def find(o,end,path):
    for t,s,e in boxes(o,end):
        if t==path[0]:
            if len(path)==1: yield s,e
            else: yield from find(s,e,path[1:])
tracks=[]
for s,e in find(0,len(d),['moov','trak']):
    hd=[x for x in find(s,e,['mdia','hdlr'])][0]; typ=d[hd[0]+8:hd[0]+12].decode()
    md=[x for x in find(s,e,['mdia','mdhd'])][0]; v=d[md[0]]
    ts=struct.unpack('>I',d[md[0]+12:md[0]+16])[0] if v==0 else struct.unpack('>I',d[md[0]+20:md[0]+24])[0]
    st=list(find(s,e,['mdia','minf','stbl']))[0]
    tab={}
    for t,a,b in boxes(*st): tab[t]=(a,b)
    def u32(o): return struct.unpack('>I',d[o:o+4])[0]
    a,_=tab['stsz']; ssz=u32(a+4); n=u32(a+8)
    sizes=[ssz]*n if ssz else [u32(a+12+4*i) for i in range(n)]
    a,_=tab['stsc']; n=u32(a+4); stsc=[struct.unpack('>III',d[a+8+12*i:a+20+12*i]) for i in range(n)]
    if 'co64' in tab:
        a,_=tab['co64']; n=u32(a+4); co=[struct.unpack('>Q',d[a+8+8*i:a+16+8*i])[0] for i in range(n)]
    else:
        a,_=tab['stco']; n=u32(a+4); co=[u32(a+8+4*i) for i in range(n)]
    print(typ, ts, 'samples',len(sizes),'chunks',len(co), stsc[:3], file=sys.stderr)
    if typ=='soun':
        # chunk -> (offset, bytes)
        out=[]; si=0
        for ci,off in enumerate(co):
            spc=[r[1] for r in stsc if r[0]<=ci+1][-1]
            b=sum(sizes[si:si+spc]); out.append((off,b,spc)); si+=spc
        json.dump(dict(timescale=ts,chunks=out,sizes=sizes),open('audio_index.json','w'))
        stsd=tab['stsd']; print('stsd', d[stsd[0]:stsd[0]+120].hex(), file=sys.stderr)
