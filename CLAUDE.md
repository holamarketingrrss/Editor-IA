# Editor IA — Hola Marketing

Este repo es el editor de video de la agencia. Los pedidos llegan con la plantilla de prompt
"Plantilla de prompt – Pedido de video" (https://claude.ai/artifact/M5jZec7d913eC9akKkGMku).

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

- Proyecto nuevo en `proyectos/<cliente>-<tema>/` (ver `proyectos/lujis-thanksgiving` como modelo):
  `inventario.tsv` → miniaturas → `edl.tsv` → `make_clips.py` → `make_words.py` → `reel/` (Remotion).
- Drive: listar con el conector; descargar videos con `scripts/drive_get.sh` (partes de 16 MB).
  No pedir archivos completos en paralelo: Drive bloquea la descarga por cupo. Miniaturas con
  `scripts/thumb_head.sh`, de a 4 en paralelo como máximo.
- Voz: ElevenLabs (`creative_generate_speech`, eleven_v4). Tiempos por palabra: whisper.cpp
  (`tools/whisper.cpp`, modelo small, `-ml 1 -sow -ojf`).
- Defaults: corte directo, arranque con el gancho, cierre con logo + @handle, zona segura 9:16
  (sin texto en los 220 px de arriba ni los 420 px de abajo), audio a -14 LUFS / -1,5 dBTP, MP4 H.264 30 fps.
- Antes de renderizar todo, revisá stills de las palabras clave (contraste y que no tapen caras).
- Entrega: el conector de Drive no sube más de ~3 MB; mandá el video por el chat (SendUserFile)
  y avisá que hay que subirlo a Editor IA › Resultados Finales. Nombre: `MARCA_Tema_Formato_vN.mp4`.

## Setup de una sesión nueva

`bash scripts/instalar.sh` (FFmpeg, yt-dlp, whisper.cpp, Remotion, HyperFrames). Chromium: `/opt/pw-browsers/chromium`.
