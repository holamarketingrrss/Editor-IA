import struct, json, sys
exec(open('parse.py').read().split("tracks=[]")[0])
for s,e in find(0,len(d),['moov','trak']):
    hd=[x for x in find(s,e,['mdia','hdlr'])][0]; typ=d[hd[0]+8:hd[0]+12].decode()
    if typ!='vide': continue
    st=list(find(s,e,['mdia','minf','stbl']))[0]; tab={}
    for t,a,b in boxes(*st): tab[t]=(a,b)
    u32=lambda o: struct.unpack('>I',d[o:o+4])[0]
    a,_=tab['stts']; n=u32(a+4); print('stts',[struct.unpack('>II',d[a+8+8*i:a+16+8*i]) for i in range(min(n,5))], n)
    a,_=tab['stsz']; n=u32(a+8); sizes=[u32(a+12+4*i) for i in range(n)]
    a,_=tab['co64']; n=u32(a+4); co=[struct.unpack('>Q',d[a+8+8*i:a+16+8*i])[0] for i in range(n)]
    a,_=tab['stss']; n=u32(a+4); ss=[u32(a+8+4*i) for i in range(n)]
    print('keyframes',len(ss),ss[:5])
    json.dump(dict(off=co,size=sizes,key=ss),open('video_index.json','w'))
