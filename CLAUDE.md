# Editor IA — Hola Marketing

Este repo es el editor de video de la agencia. Los pedidos llegan con la plantilla de prompt
"Brief de video – Editor IA" (https://claude.ai/artifact/M5jZec7d913eC9akKkGMku). Si el link no abre
en la cuenta donde corrés, buscala por ese nombre listando los artifacts.

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

- Proyecto nuevo: `scripts/nuevo_proyecto.sh <cliente> <tema> --tokens <tokens.json del design system> --handle @marca
  --logo <archivo> [--fondo-outro <color>] [--acentos a,b,c] [--assets <dir con fonts/ y brand/>]` crea
  `proyectos/<cliente>-<tema>/` desde `template/` con `reel/src/brand.json` (colores, fuentes, logo y handle de la marca;
  el aviso de fuente sin archivo se resuelve a mano). Después: `inventario.tsv` → miniaturas → `edl.tsv` →
  `python3 scripts/make_clips.py <proyecto>` → `python3 scripts/make_words.py <proyecto>` → `reel/` (Remotion).
  Detalles por pieza en `proyecto.json` (stickers, música, outro) y `guion.json` (estilo por palabra). Los scripts
  empujan el texto a la zona segura 9:16 solos. `proyectos/lujis-thanksgiving` es el ejemplo histórico (scripts propios).
- Drive: listar con el conector; descargar videos con `scripts/drive_get.sh` (partes de 16 MB).
  No pedir archivos completos en paralelo: Drive bloquea la descarga por cupo. Miniaturas con
  `scripts/thumb_head.sh`, de a 4 en paralelo como máximo.
- Voz: ElevenLabs (`creative_generate_speech`, eleven_v4). Tiempos por palabra: whisper.cpp
  (`tools/whisper.cpp`, modelo small, `-ml 1 -sow -ojf`).
- Defaults: corte directo, arranque con el gancho, cierre con logo + @handle, zona segura 9:16
  (sin texto en los 220 px de arriba ni los 420 px de abajo), audio a -14 LUFS / -1,5 dBTP, MP4 H.264 30 fps.
- Antes de renderizar todo: `scripts/stills.sh <proyecto>` deja UNA hoja `out/stills/hoja.jpg` con las palabras clave, stickers y
  cierre; mirá solo esa imagen (contraste y que no tapen caras: eso no se detecta solo). `scripts/zona_segura.py <proyecto>`
  chequea zona segura y contraste sin renderizar; `render.sh` frena si algo invade la zona segura. `bash tests/smoke.sh` prueba el flujo.
- Render final: `scripts/render.sh <proyecto>` (Remotion + loudnorm en 2 pasadas) deja `<proyecto>/out/MARCA_Tema_Formato_vN.mp4`
  (la versión sube sola) y chequea H.264, 1080x1920, 30 fps, -14 LUFS y pico ≤ -1 dBTP; si dice REVISAR, no se entrega.
- Entrega: el conector de Drive no sube más de ~3 MB; mandá el video por el chat (SendUserFile)
  y avisá que hay que subirlo a Editor IA › Resultados Finales.

## Setup de una sesión nueva

`bash scripts/instalar.sh` (FFmpeg, yt-dlp, whisper.cpp, Remotion, HyperFrames). Chromium: `/opt/pw-browsers/chromium`.
