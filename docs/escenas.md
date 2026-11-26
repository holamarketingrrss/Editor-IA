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

## Ilustraciones a medida (`"tipo": "ilustracion"`)

Para explicar algo con dibujos animados (teléfonos que se conectan, interruptores, datos que viajan), como el reel de
TECNO "Inicio rápido". La escena dice qué componente usar y el rótulo de arriba; el componente lo escribe Claude en
`reel/src/ilustraciones.jsx` del proyecto, con las piezas del kit, en 10 a 20 líneas por escena:

```json
{"id": "p2", "tipo": "ilustracion", "componente": "Conexiones", "paso": "PASO 2 · Conexiones", "dur": 2.5, "fondo": "verde"}
```

```jsx
export const Conexiones = ({kit}) => {
  const {Interruptor} = kit;
  return <>
    <Interruptor y={620} icono="bluetooth" texto="Bluetooth" prende={18} />
    <Interruptor y={820} icono="wifi" texto="Wi-Fi" desde={6} prende={34} />
  </>;
};
```

- **Lo pone el editor:** fondo de la marca (con puntos por defecto), rótulo `paso` arriba, salida de la escena y subtítulos
  de la voz en una franja abajo (y 1250-1420); el dibujo va entre y 330 y 1180.
- **Colores:** el acento es el color de destacado de la marca (si tiene) y el texto el que se lea sobre el fondo; `acento` y
  `color` en la escena los fuerzan.
- **Kit** (`kit` en las props; x, y = centro en px de 1080x1920; `desde`, `prende` y `dura` en cuadros de la escena, 30 por segundo):

| Pieza | Para qué |
|---|---|
| `Telefono {x, y, w, etiqueta, brillo, desde, pantalla}` | teléfono; adentro van `Apps` u otras piezas |
| `Apps {cols, filas}` | grilla de apps dentro de la pantalla |
| `Interruptor {y, icono, texto, desde, prende}` | tarjeta con interruptor que se prende |
| `Tilde {x, y, size, desde}` | tilde que se dibuja en un círculo |
| `Ondas {x, y, size, desde}` | ondas de radar (conexión, señal) |
| `Vuela {de, a, iconos, desde, cada}` | íconos que viajan en arco de un punto a otro |
| `Progreso {y, desde, dura, hasta, texto}` | barra con porcentaje |
| `Bateria {x, y, nivel}`, `Tarjeta {y, titulo, texto, boton, icono}`, `Checklist {y, items, cada}`, `Titulo {y, texto}` | batería, aviso del sistema, pasos con tilde, texto con *destacado* |
| `Icono {n, size, color}` | bluetooth, wifi, check, foto, contacto, chat, app, nube, candado, tarjeta, camara, estrella, corazon, carrito, reloj, rayo, escudo, ubicacion, mas, flecha, bateria |

Para algo que el kit no tiene, el componente puede usar `useCurrentFrame`, `interpolate` y `spring` de `remotion` y divs
con estilos; `kit.entra(frame, desde)` da la entrada con rebote de las piezas.

 sin `edl.tsv`. Van en orden y el cierre (logo + @handle) se agrega después de la última.
- **Mezcla con tomas:** en `edl.tsv`, una fila con archivo `escena:<id>` (inicio, fin, `escena:gancho`, 0).
- **Audio:** sin voz, poné música (`"music"`): un reel sin audio no pasa el chequeo del render. Con voz, `voz.sh` como siempre.
- **Revisar:** `scripts/armar.sh <p> --stills` deja un cuadro por escena en la hoja. En la app, pestaña *Escenas*: textos,
  tipo, fondo, duración y orden, con vista previa al instante.
