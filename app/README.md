# App del editor (localhost)

Interfaz para revisar y retocar un reel sin tocar archivos a mano. Usa la misma composición que el render
(`template/reel/src/Reel.jsx`) y los mismos scripts del repo, así que lo que se ve es lo que se exporta.

```bash
cd app && npm install      # una vez (scripts/instalar.sh ya lo hace)
npm run editor             # abre http://127.0.0.1:4321
```

- **Claude** (el motor): sin proyecto abierto, *Pedido nuevo* (con selector de marca: usa su preset) recibe el brief y Claude arma el reel completo
  (Notion, design system, Drive, voz con ElevenLabs, corte, subtítulos, cierre). Con un proyecto abierto, *Cambios*:
  un cambio por línea con el segundo del reel (*Insertar tiempo* pone el actual). Claude sigue la misma sesión del
  pedido (`proyectos/<id>/.claude.json`), se ve su progreso en vivo y la vista previa se actualiza sola.
- **Textos:** corregir palabras, color, fuente, tamaño, tiempos y posición (botón *Mover* + clic en la vista previa).
  Guarda solo lo tocado en `guion.json` y corre `make_words.py`.
- **Tomas:** cambiar archivo de `raw/`, punto de entrada y duración, reordenar, quitar, agregar, subir videos.
  Guarda `edl.tsv` y corre `make_clips.py` (recorta solo las tomas que cambiaron).
- **Audio:** volumen de voz y música, elegir o subir música, audio original. Guarda en `proyecto.json`.
- **Estilo:** las opciones del brief (`scripts/estilo.py`). Guarda solo lo que cambió en `proyecto.json` → `estilo`.
  *Guardar como estilo de <marca>* lo pasa al preset de la marca (`presets/`).
- **Exportar:** corre `scripts/render.sh` con el progreso en vivo y deja el link de descarga.

### Claude en la compu del equipo

La app corre `claude -p` (Claude Code) en el repo con la cuenta logueada en esa compu: usa su plan y sus conectores
de claude.ai (Notion, Google Drive, ElevenLabs). Requisitos, una vez por compu:

1. Instalar Claude Code y loguearse con la cuenta de la agencia: `claude`, después `/login` (login de claude.ai, no API key:
   con API key no cargan los conectores).
2. Abrir `claude` una vez en la carpeta del repo y aceptar el aviso de confianza (así toma `.claude/settings.json`).
3. Si al pedir algo el registro dice "Sin conectores de claude.ai", revisarlos en claude.ai › Configuración › Conectores.

Uso: cada pedido termina mostrando el costo (en los cambios, acumulado del proyecto). El detalle por proyecto, con
tokens por modelo: `python3 scripts/uso.py proyectos/<id>` (sin argumento: todos). Es el equivalente en la API: con
el login de claude.ai no se cobra aparte, pero cuenta para los límites del plan.

Permisos: corre en modo `auto` (aprueba lo seguro; lo que necesite permiso se deniega y la app lo lista al final).
Variables opcionales al lanzar la app: `EDITOR_CLAUDE_MODELO` (por ej. `sonnet`; vacío = el de la cuenta) y
`EDITOR_CLAUDE_PERMISOS` (`auto`, `acceptEdits`, `dontAsk`). Las instrucciones extra para Claude están en `server/prompt_app.md`.

Lista los proyectos de `proyectos/` hechos con la plantilla (no los marcados con `reel/src/.propia`).
La API (`server/api.js`) corre dentro del servidor de Vite y solo escucha en 127.0.0.1.

Remotion es gratis para personas y empresas de hasta 3 personas; con más, necesita licencia de empresa (remotion.pro).
