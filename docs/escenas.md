# Escenas de motion graphics

Para videos sin material grabado (o placas entre tomas): `proyecto.json` → `"escenas"`. Cada escena es una plantilla
animada que toma colores, fuentes y logo de la marca, y deja todo el texto dentro de la zona segura 9:16.

```json
"escenas": [
  {"id": "gancho", "tipo": "titulo", "dur": 2.6, "fondo": "tinta", "texto": "¿Tu marca publica todos los días y *no vende*?"},
  {"id": "dato",   "tipo": "numero", "dur": 2.6, "fondo": "amarillo", "numero": 73, "sufijo": "%", "texto": "de los reels se *abandonan* en 3 segundos"},
  {"id": "claves", "tipo": "lista",  "dur": 3.4, "fondo": "azul", "texto": "Lo que *sí* funciona", "items": ["Gancho en el primer segundo", "Un mensaje por reel"]},
  {"id": "cita",   "tipo": "frase",  "dur": 2.8, "fondo": "crema", "texto": "El contenido que *vende* se entiende sin sonido.", "autor": "Hola Marketing"},
  {"id": "prod",   "tipo": "imagen", "dur": 2.5, "img": "producto.png", "texto": "Nuevo *sabor*"},
  {"id": "cta",    "tipo": "titulo", "dur": 2.2, "fondo": ["naranja", "rojo"], "texto": "Escribinos *HOLA*", "logo": true}
]
```

| Campo | Qué hace |
|---|---|
| `tipo` | `titulo` (renglones que suben de a uno) · `lista` (título + ítems numerados que entran de a uno; `"numerada": false` = tildes) · `numero` (contador de `desde` a `numero`, con `prefijo`/`sufijo`) · `imagen` (foto o producto de `raw/` con zoom suave) · `frase` (cita que aparece palabra por palabra, con `autor`) |
| `texto` | `*palabra*` = destacada: franja del color de acento detrás (en lista y frase, la palabra en color). `\n` fuerza un renglón. El tamaño se ajusta solo. |
| `fondo` | Color de la marca (`"amarillo"`) o hex; `["a", "b"]` = degradé. Por defecto, el fondo del cierre de la marca. |
| `decor` | `formas` (círculos de la marca, por defecto) · `lineas` · `puntos` · `ninguno` |
| `color`, `acento` | Fuerzan el color del texto o del destacado (si no, se eligen solos para que se lean sobre el fondo). |
| `sub` | Bajada chica (título y número). `logo: true` pone el logo arriba. `alineacion: "izquierda"`. |
| `dur` | Segundos. Con voz, que cada escena dure lo que su frase. |
| `subtitulos` | `true` muestra los subtítulos de la voz encima (por defecto no: la escena ya tiene su texto). |

- **Video solo de escenas:** sin `edl.tsv`. Van en orden y el cierre (logo + @handle) se agrega después de la última.
- **Mezcla con tomas:** en `edl.tsv`, una fila con archivo `escena:<id>` (inicio, fin, `escena:gancho`, 0).
- **Audio:** sin voz, poné música (`"music"`): un reel sin audio no pasa el chequeo del render. Con voz, `voz.sh` como siempre.
- **Revisar:** `scripts/armar.sh <p> --stills` deja un cuadro por escena en la hoja. En la app, pestaña *Escenas*: textos,
  tipo, fondo, duración y orden, con vista previa al instante.
