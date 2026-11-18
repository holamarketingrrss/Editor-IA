import json, sys, os, requests, threading, time
from concurrent.futures import ThreadPoolExecutor
URL="https://drive.usercontent.google.com/download?id=1k_NSAok-jQuFmFM1kK2vF5CyPnGI4Fl7&export=download&confirm=t"
j=json.load(open('audio_index.json')); ch=j['chunks']
lim=int(sys.argv[1]) if len(sys.argv)>1 else len(ch)
os.makedirs('ach',exist_ok=True)
tl=threading.local()
def get(i):
    off,n,_=ch[i]; p=f'ach/{i:05d}'
    if os.path.exists(p) and os.path.getsize(p)==n: return 0
    if not hasattr(tl,'s'): tl.s=requests.Session()
    for t in range(6):
        try:
            r=tl.s.get(URL,headers={'Range':f'bytes={off}-{off+n-1}'},timeout=60, verify='/root/.ccr/ca-bundle.crt')
            if r.status_code==206 and len(r.content)==n:
                open(p,'wb').write(r.content); return 0
        except Exception as e: pass
        time.sleep(2*(t+1))
    return 1
t=time.time()
with ThreadPoolExecutor(10) as ex: fails=sum(ex.map(get,range(lim)))
print('fails',fails,'time',time.time()-t)
