# JOAH · Guion 11 — Tu próximo stock en 20 segundos (Reel 9:16, 20,5 s)

Material: Drive `1Lf_iBMU3ThjeSzcMJGeUJnptxQSdj2Eq` (C4491–C4499, Sony vertical 50 fps).
Pasos: `inventario.tsv` → `edl.tsv` → `python3 make_clips.py .` (recorte + color "mejorar 50%" + pista de voz)
→ `python3 make_words.py .` → `python3 build_data.py .` → `npx remotion render src/index.jsx Reel ../out_video.mp4 --muted`
→ mezcla voz + música (`audio/m2.mp3`, ElevenLabs Music, rock sport 125 BPM) a -14 LUFS / -1,5 dBTP y mux.

- Gancho: C4498 16.70 s · CTA: C4499 14.20 s (voz original en primer plano).
- Beneficios del guion como texto palabra por palabra sobre b-roll, un corte por remera al beat (0,48 s).
- Flash celeste / blanco alternados; zoom in/out alternado por toma; arranque con zoom in.
- Sin Design System de JOAH en Artifacts: verde de marca #517054 tomado del logo (Drive madre › LOGOS);
  oliva claro #A9C483 para texto sobre video; Montserrat 300–900.
