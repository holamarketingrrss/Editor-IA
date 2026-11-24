#!/bin/bash
# uso: transcribe.sh <nombre> -> audio/<n>.wav + audio/<n>.json (palabras con tiempos)
n=$1; W=/home/user/Editor-IA/tools/whisper.cpp
ffmpeg -nostdin -v error -i raw/$n -ac 1 -ar 16000 audio/$n.wav -y
$W/build/bin/whisper-cli -m $W/models/ggml-small.bin -l es -ml 1 -sow -ojf -of audio/$n -f audio/$n.wav -t 8 >/dev/null 2>&1
python3 -c "
import json,sys
t=json.load(open('audio/$n.json'))['transcription']
print('$n', ' '.join(f\"[{s['offsets']['from']/1000:.1f}]{s['text'].strip()}\" if i%8==0 else s['text'].strip() for i,s in enumerate(t) if s['text'].strip()))
"
