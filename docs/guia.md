# Guía del Editor IA

El editor arma los reels de las marcas de Hola Marketing: Claude hace el trabajo pesado (lee la ficha, baja el material,
corta, subtitula y cierra) y vos lo revisás y retocás en la app. Esta guía se edita en **Ajustes › Guía del editor**.

## 1. Entrar
- Abrí la app (`npm run editor` en tu compu, o la dirección de la compu del equipo) y entrá con tu usuario y clave.
- ¿Te olvidaste la clave? Pedísela a un admin: **Equipo › Clave** en tu fila.

## 2. Pedir un video nuevo
1. En **Proyectos**, elegí la **marca** (tarjeta con su logo): trae colores, fuentes, logo, voz y estilo de la marca.
2. Elegí una **plantilla** y completá lo que está entre corchetes (`Tab` pasa al siguiente). Borrá las líneas que no apliquen.
   - **Recap con voz en off**: tomas del Drive + voz de la marca + subtítulos.
   - **Persona a cámara**: la voz es la de las tomas; cortes limpios y audio podcast.
   - **Motion graphics**: sin material grabado, escenas animadas.
   - **Cámara + explicación animada**: habla a cámara y, en la voz en off, dibujos animados de lo que explica.
3. Elegí el **modelo**: Sonnet rinde bien y gasta menos; Opus para piezas complejas.
4. **Editar con Claude** (o `Ctrl/⌘ + Enter`). Vas viendo lo que hace; al terminar se abre el proyecto.

Lo que no esté en el pedido, Claude lo toma de la ficha de Notion y de la marca. Cuanto más claro el pedido, menos vueltas
(y menos gasto).

## 3. Retocar (pestañas del editor)
- **Claude**: cambios escritos, uno por línea con el segundo del reel. Pausá donde querés el cambio y usá los botones
  (Texto, Toma, Más corto, Destacar, Zoom) o **Insertar** el tiempo.
- **Textos**: corregir palabras, color, fuente, tamaño y tiempos. Clic en una fila y arrastrá la palabra en la vista previa.
  **Varias a la vez:** `Shift + clic` elige un rango y `Ctrl/⌘ + clic` suma o saca; al arrastrar se mueven todas juntas, y la
  barra de arriba cambia color, fuente o tamaño (A− / A+), las pone en el mismo lugar, las centra o las endereza. **Todas**
  aplica un cambio a todo el video.
- **Tomas / Escenas**: cambiar, recortar, reordenar o subir tomas; en videos de motion graphics, editar las escenas.
- **Capas** (o el botón **+ Capas** debajo del video): línea de tiempo con filas para sumar **imágenes** (PNG con
  transparencia, JPG), **textos libres**, **emojis** y **audios** (un sonido, una canción, otra voz). Cada capa se mueve
  arrastrando su bloque, se alarga o acorta desde los bordes, y las visibles se arrastran en la vista previa. Al elegirla:
  tamaño, rotación, opacidad, entrada (pop, fundido, deslizar), volumen, adelante / atrás, duplicar o quitar.
- **Audio**: volumen de voz y música, subir música.
- **Estilo**: tamaño general de los textos, subtítulos, palabras clave (efecto, color, frases), cámara, transiciones,
  cierre, etiqueta arriba y sonidos. *Guardar como estilo de la marca* lo deja por defecto para todos sus videos.
- **Color**: retoque de las tomas: exposición, contraste, saturación, luces, sombras, temperatura y tinte, con puntos de
  partida (Más vivo, Cálido, Frío, Luminoso, Dramático). Doble clic en un control lo vuelve a 0.
- Todo se ve al instante; **Aplicar** lo guarda. **Descartar** vuelve a lo guardado. Aplicá una pestaña antes de pasar
  a otra.
- **Sin Claude también se edita:** Textos, Tomas, Capas, Audio, Estilo, Color y Exportar no usan Claude. Si se terminó
  el uso del plan, se sigue retocando y exportando igual.
- Atajos: `Espacio` reproduce, `← →` un segundo, `Shift + ← →` un cuadro, `?` muestra todos.

## 4. Exportar y entregar
- **Exportar** arma el MP4 final (1080x1920, -14 LUFS). Si dice **REVISAR**, no se entrega: mirá el detalle
  (un video sin voz ni música, por ejemplo, no pasa).
- Descargalo y subilo a Drive › Editor IA › Resultados Finales.

## 5. Proyectos
- En la galería, el botón **⋯** de cada proyecto: **Duplicar** (para una variante), **Renombrar** y **Eliminar**.
- Eliminar lo manda a la **Papelera** (abajo de la galería): se puede **Recuperar** cuando quieras.

## 6. Marcas
En **Marcas** se edita todo lo de cada marca, sin código:
- **Datos**: nombre, @usuario, carpeta madre de Drive y link del design system.
- **Colores**: la paleta (con nombre y color) y cuáles son los acentos (destacados).
- **Fuentes**: casilleros G (títulos y destacados), B (texto), S (mayúsculas, @ del cierre) y K (opcional). Subí el
  archivo (.woff2, .ttf u .otf) y elegilo; el ancho se mide solo.
- **Logo e isotipo** (para el cierre), **cierre** (color de fondo) y **voz** (ID de ElevenLabs y nombre).
- **Design system y estrategia**: las notas que lee Claude para respetar la marca (una por línea).
- **Nueva marca**: arranca neutra; completala acá o pedile a Soporte que la arme desde su design system.

Los cambios valen para los proyectos nuevos y para los existentes la próxima vez que se arman o exportan.

## 7. Ajustes
- **Plantillas de pedido**: sumá, cambiá o borrá plantillas.
- **Instrucciones para Claude**: cómo trabaja en pedidos y cambios. Cambialas con cuidado: cada línea se lee en
  todos los pedidos (más texto = más gasto).
- **Guía del editor**: esta guía.
- Cada vez que guardás queda la versión anterior, y **Volver al original** deja la versión del repositorio.

## 8. Soporte
- **Preguntar**: cómo se hace algo, por qué salió de tal forma. Claude responde mirando la guía y la configuración, sin
  cambiar nada.
- **Pedir un cambio**: "agregá el color X a TECNO", "que el cierre de LUJI'S sea con anillo", "sumá una plantilla para
  stories". Claude hace el cambio y te dice qué tocó. Si hace falta código, lo prueba antes.
- Los cambios quedan en la compu donde corre la app (en la compu del equipo, para todos).

## 9. Equipo (admins)
- Agregar personas, roles (editor o admin), desactivar, cambiar clave y límite de gasto mensual de Claude.
- Registro: quién hizo qué y cuánto costó. Detalle en `app/EQUIPO.md`.

## Preguntas frecuentes
- **Claude dice "sin conectores"**: en una terminal, `claude` y después `/status` (cuenta) y `/mcp` (Notion, Drive,
  ElevenLabs). Si falta alguno, autorizalo en claude.ai › Configuración › Conectores.
- **Los textos se ven muy grandes o chicos**: Estilo › *Tamaño de los textos*; para toda la marca, *Guardar como estilo de la marca*.
  Para algunas palabras: Textos › elegilas con Shift › A− / A+.
- **Quiero poner un logo, un PNG o un sonido en un momento**: Capas › + Imagen o + Audio (queda donde está el cabezal).
- **Una palabra clave sale partida**: Estilo › Palabras clave › escribila como frase ("18 Pro Max").
- **La persona a cámara queda tapada**: pedile a Claude que las escenas vayan solo en la voz en off.
- **Cuánto gastó un video**: lo dice el registro de Claude al terminar; el total del mes, en Equipo.
- **La app no abre después de actualizar**: cerrala y volvé a abrirla; instala sola lo que falte.
