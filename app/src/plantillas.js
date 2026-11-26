// Plantillas de pedido para Claude (pestaña Claude › Pedido nuevo). Cortas a propósito: la marca (con su preset, voz,
// estilo y estrategia) la da la tarjeta elegida, y el guion, copy y CTA salen de la ficha de Notion. Acá va solo lo que
// Claude no puede saber solo. Lo que está entre [corchetes] se completa; una línea que no aplica se borra.
// Para sumar o cambiar una plantilla, editá esta lista: la app la muestra tal cual.
export const PLANTILLAS = [
  {
    id: 'recap',
    nombre: 'Recap con voz en off',
    ayuda: 'Tomas del Drive + voz de la marca (ElevenLabs) + subtítulos',
    texto: `Tipo: recap con voz en off y subtítulos.
Ficha: [link de la ficha en Notion]
Material: [link de la carpeta de Drive] (sin: [tomas a excluir])
Duración: [15] s
Pedidos puntuales: [lo que cambia respecto del estilo de la marca, o "ninguno"]`,
  },
  {
    id: 'camara',
    nombre: 'Persona a cámara',
    ayuda: 'La voz es la de las tomas; cortes limpios y audio podcast',
    texto: `Tipo: persona a cámara (la voz es la de las tomas). Seguí el guion de la ficha.
Ficha: [link de la ficha en Notion]
Material: [link de la carpeta de Drive]
Palabras clave: [ej. Black Friday, 18 Pro Max, Plan Canje]
Etiqueta arriba: [TEMA · bajada]
Ritmo: audio podcast, zooms suaves con swoosh y click en las palabras clave`,
  },
  {
    id: 'motion',
    nombre: 'Motion graphics',
    ayuda: 'Sin material grabado: escenas animadas con la marca',
    texto: `Tipo: motion graphics, sin material grabado.
Ficha: [link de la ficha en Notion]
Escenas: [gancho, dato o número, lista de 3 puntos, cierre con CTA] (si lo dejás así, salen de la ficha)
Voz en off: [sí, con la voz de la marca / no, con música: link]
Duración: [20] s`,
  },
  {
    id: 'mixto',
    nombre: 'Cámara + explicación animada',
    ayuda: 'Habla a cámara y, en la voz en off, escenas de color sobre lo que dice',
    texto: `Tipo: persona a cámara + escenas animadas en la voz en off.
Ficha: [link de la ficha en Notion]
Material: [link de la carpeta de Drive]
Escenas: mientras habla en off, fondo de color de la marca con escenas sobre lo que dice ([ej. pasos 1 a 5])
Palabras clave: [ej. Inicio rápido, Bluetooth, Plan Canje]
Ritmo: audio podcast, zooms suaves con swoosh y click en las palabras clave`,
  },
];

// Para "Cambios": arranques de línea frecuentes (se insertan con el tiempo actual del reel)
export const CAMBIOS = [
  ['Texto', 'cambiá «[palabra]» por «[nueva]»'],
  ['Toma', 'cambiá esta toma por una de [qué se tiene que ver]'],
  ['Más corto', 'recortá esta parte: [qué sobra]'],
  ['Destacar', 'destacá «[palabra o frase]»'],
  ['Zoom', 'acercá acá con swoosh'],
];
