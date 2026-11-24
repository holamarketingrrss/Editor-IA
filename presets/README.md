# Presets de marca

Un preset por cliente: lo que hace falta para sacar un reel de la marca sin volver a leer el design system.

| archivo | qué tiene |
| --- | --- |
| `brand.json` | colores, fuentes (4 casilleros G/B/S/K con su ancho medido), logo, @handle y cierre |
| `preset.json` | marca, link al design system, voz por defecto (ElevenLabs), notas de marca para Claude y **estilo de edición por defecto** (opciones de `scripts/estilo.py`) |
| `public/brand/` | logos y stickers bajados del asset store del design system |
| `public/fonts/` | fuentes (woff2) |

- Proyecto nuevo: `scripts/nuevo_proyecto.sh <cliente> <tema> --preset <marca>`. El proyecto guarda `"preset"` en `proyecto.json`
  y `sync_reel.sh` le actualiza el `preset.json` cada vez que se hacen stills o render: un cambio de estilo de la marca le llega a sus piezas.
- Estilo final de una pieza = defaults del editor ← `preset.json` de la marca ← `proyecto.json` → `estilo` (lo propio de la pieza).
- Desde la app: pestaña Estilo → *Guardar como estilo de <marca>* pasa lo que se cambió en la pieza al preset (menos zócalo, títulos y destacados).
- Prueba visual: `bash tests/presets.sh [marca]` deja `proyectos/presets-prueba.jpg` con 4 frames por marca.

Marca nueva desde su design system: bajá del artifact `project/design-system.json`, `tokens.json`, `README.md`, las fuentes
(`project/fonts/...`) y los assets de logos y stickers (por id), y corré
`python3 scripts/preset_desde_ds.py <carpeta> --marca <slug> --handle @marca [--logo archivo] [--fondo-outro color] [--voz propia]`:
arma colores, fuentes con su ancho medido, logos y stickers. Después completá a mano `notas`, `estilo`, `estrategia` y `driveMadre`.

A mano: copiá una carpeta, bajá logos/stickers/fuentes del design system (`Design System – <cliente>`), armá `brand.json`
(colores del `tokens.json`; el `ancho` de cada fuente se mide con PIL: ancho medio de un glifo / tamaño) y elegí el estilo
según el README del design system. Fuentes comerciales que no vienen en el paquete: un equivalente libre, anotado en las notas.

| marca | handle | reemplazos de fuente |
| --- | --- | --- |
| `lujis` | @luji.miami | Avallon (script, sin archivo) → Kaushan Script |
| `pausa` | @enjoypausa | Helvetica Now (comercial) → Arimo |
