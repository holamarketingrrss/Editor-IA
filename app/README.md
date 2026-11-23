# App del editor (localhost)

Interfaz para revisar y retocar un reel sin tocar archivos a mano. Usa la misma composición que el render
(`template/reel/src/Reel.jsx`) y los mismos scripts del repo, así que lo que se ve es lo que se exporta.

```bash
cd app && npm install      # una vez (scripts/instalar.sh ya lo hace)
npm run editor             # abre http://127.0.0.1:4321
```

- **Textos:** corregir palabras, color, fuente, tamaño, tiempos y posición (botón *Mover* + clic en la vista previa).
  Guarda solo lo tocado en `guion.json` y corre `make_words.py`.
- **Tomas:** cambiar archivo de `raw/`, punto de entrada y duración, reordenar, quitar, agregar, subir videos.
  Guarda `edl.tsv` y corre `make_clips.py` (recorta solo las tomas que cambiaron).
- **Audio:** volumen de voz y música, elegir o subir música, audio original. Guarda en `proyecto.json`.
- **Estilo:** las opciones del brief (`scripts/estilo.py`). Guarda solo lo que cambió en `proyecto.json` → `estilo`.
- **Exportar:** corre `scripts/render.sh` con el progreso en vivo y deja el link de descarga.

Lista los proyectos de `proyectos/` hechos con la plantilla (no los marcados con `reel/src/.propia`).
La API (`server/api.js`) corre dentro del servidor de Vite y solo escucha en 127.0.0.1.

Remotion es gratis para personas y empresas de hasta 3 personas; con más, necesita licencia de empresa (remotion.pro).
