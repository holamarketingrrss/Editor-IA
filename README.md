# Editor IA — Hola Marketing

Editor de video de la agencia: arma reels 9:16 con Remotion, FFmpeg y whisper.cpp, con la marca de cada cliente
(colores, tipografías, logo y @handle) tomada de su design system. Las reglas de trabajo para Claude están en `CLAUDE.md`;
la lista de lo que falta, en `PENDIENTES.md`.

## Primera vez en una sesión o cuenta nueva

```bash
bash scripts/instalar.sh     # FFmpeg, yt-dlp, whisper.cpp (modelo small), Remotion y HyperFrames; ~1,5 min la primera vez
```

En un entorno cloud conviene ponerlo como setup script, para que cada sesión arranque lista:

```bash
if [ -d Editor-IA ]; then bash Editor-IA/scripts/instalar.sh; fi
```

## Cómo pedir un video

Se pide con el **Brief de video – Editor IA** (el documento "Plantilla de prompt – Pedido de video"). El prompt solo lleva lo propio
de la pieza; tono, público, guion y estilo salen de Notion y del design system del cliente. Versión corta, con la ficha completa:

```text
Editá el video de esta pieza: [link a la ficha en Notion].
Material: [link de Drive] (excluir […]). Formato 9:16, 15 s.
```

Cambios sobre una versión, en la misma sesión donde se hizo (un cambio por línea, con el segundo exacto):

```text
Cambios v1 → v2:
- 0:04 — "argentina" se lee poco: pasala a blanco
- 0:10 — el logo más grande y que entre más lento
```

## Qué pasa por detrás

```text
scripts/nuevo_proyecto.sh <cliente> <tema> --tokens <tokens.json> --handle @marca --logo <archivo> --assets <dir>
   -> inventario.tsv -> miniaturas (scripts/thumb_head.sh, contact.py) -> edl.tsv
   -> python3 scripts/make_clips.py <proyecto>      recorta las tomas y arma reel/src/data.json
   -> scripts/voz.sh <proyecto> --texto | --url <mp3> | --mp3 <archivo>   voz (ElevenLabs) -> audio/voz.json (whisper)
   -> python3 scripts/make_words.py <proyecto>      palabras con tiempos (voz.json de whisper) y estilo
   (estilo de la pieza en proyecto.json "estilo": opciones en scripts/estilo.py)
   -> scripts/stills.sh <proyecto>                  una hoja de contactos para revisar antes de renderizar
   -> scripts/render.sh <proyecto>                  video final en <proyecto>/out/MARCA_Tema_Formato_vN.mp4
```

Cada script tiene su uso en las primeras líneas. `render.sh` normaliza el audio a -14 LUFS / -1,5 dBTP, entrega H.264 a 30 fps
y frena si hay texto fuera de la zona segura 9:16.

## Estructura

| Carpeta | Contenido |
|---|---|
| `template/` | Proyecto base: composición Remotion que lee `brand.json`, `proyecto.json` y `guion.json` |
| `scripts/` | Instalación, creación de proyectos, miniaturas, descarga de Drive, clips, palabras, stills, zona segura y render |
| `proyectos/<cliente>-<tema>/` | Una pieza: EDL, palabras, `reel/` (Remotion). El material pesado (`raw/`, `thumbs/`, `out/`) no se versiona |
| `proyectos/lujis-thanksgiving/` | Primer reel (ejemplo histórico, con scripts propios) |
| `tests/` | `smoke.sh`: prueba el flujo sin renderizar |

## Pruebas

```bash
bash tests/smoke.sh
```

## Instalación en una compu del equipo

Ver `INSTALAR.md` (Mac y Windows con WSL). Para chequear una instalación: `bash scripts/verificar.sh`.
