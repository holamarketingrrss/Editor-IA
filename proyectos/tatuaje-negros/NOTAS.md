# Tatuaje – relleno de pantallas negras

Fuente: Drive `1012.mp4` (1440x2560, 30 fps) → `raw/1012.mp4` con `scripts/drive_get.sh`.
Tramos negros (frames): 79–138, 436–500, 937–986, 1892–2296.

- `anim/src/index.jsx`: composiciones Remotion `T1`, `T2`, `T3` (línea de tiempo Days/Weeks) y `SOL` (recordatorios).
  Fondo #500f20, gráficos #fff4e0, Inter Light (en lugar de Helvetica Light, que no estaba disponible).
- Render: `cd anim && ln -s ../../../template/reel/node_modules node_modules` y
  `npx remotion render src/index.jsx <ID> ../tmp/seg/<ID>.mp4 --crf 10 --browser-executable=/opt/pw-browsers/chromium --muted`.
- Montaje: ffmpeg trim + concat por frame (audio original copiado) → `out/Tatuaje_Cicatrizacion_Reel_v1.mp4`.
