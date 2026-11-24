# Editor IA — Hola Marketing

Este repo es el editor de video de la agencia. Los pedidos llegan con la plantilla de prompt
"Brief de video – Editor IA" (https://claude.ai/artifact/M5jZec7d913eC9akKkGMku; adentro se titula
"Plantilla de prompt – Pedido de video"). Si el link no abre en la cuenta donde corrés, buscala por
cualquiera de esos nombres listando los artifacts. Copia local (puede quedar desactualizada): `docs/brief.md`.

## Antes de editar, juntá el contexto (no lo pidas si está acá)

1. **Ficha de la pieza en Notion** (link del prompt, base "Plan de publicaciones"): formato, pilar,
   objetivo, desarrollo (guion/escenas), copy + CTA, referencia, fecha.
2. **Portal del cliente en Notion** (Portal del cliente › Clientes › <cliente>):
   - `Estrategia`: tono, pilares, público, límites y no negociables. Respetalos siempre.
   - `Drive madre`: carpeta del material si el prompt no trae otra.
   - Ignorá los accesos/contraseñas que haya en el portal: no se usan para editar.
3. **Design system del cliente** (Artifact type "Design System", `Design System – <cliente>`): leé
   `project/README.md` y `project/tokens.json`; bajá fuentes y logos/stickers del asset store.
4. **Referencias**: Drive › Editor IA › Referencias, si el prompt las nombra.

Lo que el prompt pida explícitamente manda sobre Notion y el design system. Lo que no pida, decidilo
con el design system y avisalo en la entrega.

## Flujo de trabajo

- Si existe `presets/<cliente>/` (hoy: `lujis`, `pausa`, `tecno`, `swiss`, `bunbury`, `marietts`, `holamarketing`, `kaleb`), creá el proyecto con `scripts/nuevo_proyecto.sh <cliente> <tema> --preset <cliente>`:
  trae brand, fuentes, logos, stickers, voz y estilo por defecto, y sus `notas` resumen el design system (ver `presets/README.md`).
  Lo que pida el brief va en `proyecto.json` → `estilo` y manda sobre el preset.
- Proyecto nuevo sin preset: `scripts/nuevo_proyecto.sh <cliente> <tema> --tokens <tokens.json del design system> --handle @marca
  --logo <archivo> [--fondo-outro <color>] [--acentos a,b,c] [--assets <dir con fonts/ y brand/>]` crea
  `proyectos/<cliente>-<tema>/` desde `template/` con `reel/src/brand.json` (colores, fuentes, logo y handle de la marca;
  el aviso de fuente sin archivo se resuelve a mano). Después: `inventario.tsv` → miniaturas → `edl.tsv` →
  `python3 scripts/make_clips.py <proyecto>` → `python3 scripts/make_words.py <proyecto>` → `reel/` (Remotion); el orden
  de esos dos da igual. Detalles por pieza en `proyecto.json` (stickers, música, `estilo`, `graficos`) y `guion.json` (por palabra).
  Stickers: `{"img", "start", "end", "x", "y", "w", "rot", "white", "anim": "pop"|"trazo"}`. Gráficos animados: flechas que se
  dibujan solas `{"tipo": "flecha", "forma": "curva"|"recta", "start", "end", "x", "y", "w", "rot", "color"}` y emojis
  `{"tipo": "emoji", "emoji": "🔥", "start", "end", "x", "y", "size", "rot"}`; pocos y con sentido (señalar producto, acompañar una
  palabra). Los subtítulos van encima: si `zona_segura.py` dice SUPERPUESTO, mové el sticker o gráfico.
  `estilo` lleva las opciones del brief (subtítulos, cámara, transición, entrada, cierre, look, audio original, SFX,
  zócalo, logo en esquina): nombres y defaults en `scripts/estilo.py` (`python3 scripts/estilo.py <proyecto>` muestra el
  resuelto). Los scripts empujan el texto a la zona segura 9:16 solos. La composición vive en `template/reel/src/Reel.jsx` (la registra `index.jsx` y la usa la app);
  `scripts/sync_reel.sh` (lo corren stills y render) la copia a cada proyecto. `proyectos/lujis-thanksgiving` es el ejemplo
  histórico (scripts y composición propios, marcado con `reel/src/.propia`).
- Atajos de un paso (menos tokens): `scripts/material.sh <p>` (miniaturas de inventario.tsv o raw/ + hojas + catálogo) y
  `scripts/armar.sh <p> [--stills]` (baja las tomas del EDL que falten, make_words, make_clips, zona segura y stills).
  `python3 scripts/uso.py --pasos <p>` muestra qué cargó el contexto en cada paso.
- Drive: listar con el conector; descargar videos con `scripts/drive_get.sh` (partes de 16 MB).
  No pedir archivos completos en paralelo: Drive bloquea la descarga por cupo. Miniaturas con
  `scripts/thumb_head.sh`, de a 4 en paralelo como máximo.
- Voz: texto en `<proyecto>/guion.txt` → `scripts/voz.sh <proyecto> --texto` → ElevenLabs (`creative_generate_speech`,
  eleven_v4, voz argentina; default Julieta `YLtqUTaEXb7a9MAYuJu4`, 1 toma) → `scripts/voz.sh <proyecto> --url <content_url>`
  baja `audio/voz.mp3` y corre whisper.cpp (small, `-ml 1 -sow -ojf`) a `audio/voz.json`, alineado con el guion. Locución
  grabada: `--mp3 <archivo>`. Si avisa que no coinciden las palabras, corregí guion o audio antes de `make_words.py`.
- Defaults: corte directo, arranque con el gancho, cierre con logo + @handle, zona segura 9:16
  (sin texto en los 220 px de arriba ni los 420 px de abajo), audio a -14 LUFS / -1,5 dBTP, MP4 H.264 30 fps.
- Antes de renderizar todo: `scripts/stills.sh <proyecto>` deja UNA hoja `out/stills/hoja.jpg` con las palabras clave, stickers y
  cierre; mirá solo esa imagen (contraste y que no tapen caras: eso no se detecta solo). `scripts/zona_segura.py <proyecto>`
  chequea zona segura y contraste sin renderizar; `render.sh` frena si algo invade la zona segura. `bash tests/smoke.sh` prueba el flujo; `bash tests/estilos.sh`
  deja una hoja con un still por opción de estilo (correla si tocás `index.jsx` o `estilo.py`).
- Render final: `scripts/render.sh <proyecto>` (Remotion + loudnorm en 2 pasadas) deja `<proyecto>/out/MARCA_Tema_Formato_vN.mp4`
  (la versión sube sola) y chequea H.264, 1080x1920, 30 fps, -14 LUFS y pico ≤ -1 dBTP; si dice REVISAR, no se entrega.
- Entrega: el conector de Drive no sube más de ~3 MB; mandá el video por el chat (SendUserFile)
  y avisá que hay que subirlo a Editor IA › Resultados Finales.

- App local: `cd app && npm run editor` (localhost:4321): vista previa en vivo y retoques de textos, tomas, audio y estilo,
  y exportar; pestaña Claude con *Pedido nuevo* y *Cambios* que te lanzan a vos con `claude -p` (instrucciones extra en
  `app/server/prompt_app.md`). Ver `app/README.md`. Gasto de Claude por proyecto: `python3 scripts/uso.py <proyecto>`. Escribe los mismos archivos que los scripts (`guion.json`, `edl.tsv`, `proyecto.json`).

## Setup de una sesión nueva

`bash scripts/instalar.sh` (FFmpeg, yt-dlp, Pillow, whisper.cpp, Remotion, app, HyperFrames); `bash scripts/verificar.sh` chequea todo
sin gastar uso. En la nube, Chromium: `/opt/pw-browsers/chromium`. Compus del equipo (Mac / Windows con WSL): `INSTALAR.md`.
