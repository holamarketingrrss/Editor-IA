# Arma el audio original siguiendo el EDL (tramos continuos se unen), con fundidos de 12 ms, y normaliza a -14 LUFS / -1.5 dBTP
import subprocess, sys, json
P, AAC, TOTAL = sys.argv[1], sys.argv[2], float(sys.argv[3])
rows = [l.rstrip('\n').split('\t') for l in open(f'{P}/edl.tsv') if not l.startswith('#')]
segs = []
for a, b, src, *_ in rows:
    a, b, src = float(a), float(b), float(src)
    if segs and abs(segs[-1][1] - a) < 1e-6 and abs(segs[-1][2] + (segs[-1][1] - segs[-1][0]) - src) < 0.02:
        segs[-1][1] = b
    else:
        segs.append([a, b, src])
parts = []; f = []
for i, (a, b, src) in enumerate(segs):
    d = b - a
    f.append(f'[0:a]atrim={src:.3f}:{src + d:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={d - 0.012:.3f}:d=0.012[s{i}]')
    parts.append(f'[s{i}]')
f.append(''.join(parts) + f'concat=n={len(segs)}:v=0:a=1,apad=whole_dur={TOTAL}[m]')
fc = ';'.join(f)
subprocess.run(['ffmpeg', '-v', 'error', '-i', AAC, '-filter_complex', fc, '-map', '[m]', '-ar', '48000', f'{P}/audio/edit_raw.wav', '-y'], check=True)
m = subprocess.run(['ffmpeg', '-v', 'info', '-i', f'{P}/audio/edit_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
ln = (f"loudnorm=I=-14:TP=-2.0:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
      f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{P}/audio/edit_raw.wav', '-af', 'highpass=f=70,' + ln, '-ar', '48000',
                f'{P}/reel/public/audio.wav', '-y'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{P}/audio/edit_raw.wav', '-ar', '16000', '-ac', '1', f'{P}/audio/edit16k.wav', '-y'], check=True)
print(len(segs), 'tramos de audio')
