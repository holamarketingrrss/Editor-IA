#!/bin/bash
# uso: seg_get.sh t0 t1 sparsefile -> baja solo los bytes de [t0,t1] (s) dentro de un archivo disperso del tamaño original
cd "$(dirname "$0")"; t0=$1; t1=$2; out=$3; SIZE=17293379560
url="https://drive.usercontent.google.com/download?id=1k_NSAok-jQuFmFM1kK2vF5CyPnGI4Fl7&export=download&confirm=t"
read a b < <(python3 -I -c "
import json
v=json.load(open('video_index.json')); fr=1001/30000
i0=max(0,int($t0/fr)-1); i1=min(len(v['off'])-1,int($t1/fr)+1)
k=[x-1 for x in v['key'] if x-1<=i0][-1]
a=v['off'][k]-3000000; b=v['off'][i1]+v['size'][i1]+3000000
print(max(a,2097152), min(b,$SIZE-1))")
[ -f "$out" ] || { truncate -s $SIZE "$out"; dd if=moov.bin of="$out" conv=notrunc status=none; }
echo "rango $a-$b ($(( (b-a)/1000000 )) MB)"
s=$a; step=16000000
while [ $s -le $b ]; do e=$((s+step-1)); [ $e -gt $b ] && e=$b
  for t in 1 2 3 4; do curl -sS -r $s-$e -o "$out.chunk" --max-time 120 "$url" && [ "$(stat -c%s "$out.chunk")" = "$((e-s+1))" ] && break; sleep $((t*3)); done
  [ "$(stat -c%s "$out.chunk")" = "$((e-s+1))" ] || { echo FALLO $s; exit 1; }
  dd if="$out.chunk" of="$out" bs=1M seek=$s oflag=seek_bytes conv=notrunc status=none; s=$((e+1))
done; rm -f "$out.chunk"; echo OK
