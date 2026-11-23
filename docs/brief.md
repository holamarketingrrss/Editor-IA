# Plantilla de prompt – Pedido de video

Nov 16, 2026 · @HM

El prompt solo lleva lo que es propio de este video: qué pieza es, qué material usar y cómo querés la edición. Tono, público, copy y estilo visual el editor los saca del portal de Notion del cliente y de su design system.

## Qué toma el editor solo

No repitas en el prompt lo que ya está en estas fuentes: si algo cambia, se actualiza ahí.

| Fuente | Qué saca el editor |
| --- | --- |
| Notion · Portal del cliente · Estrategia | Tono, pilares, público, objetivos, límites y no negociables |
| Notion · Plan de publicaciones · ficha de la pieza | Formato, pilar, objetivo, desarrollo (guion o escenas), copy + CTA, referencia, fecha de publicación |
| Notion · Portal del cliente · Drive madre | Dónde está el material del cliente |
| Design system del cliente en Claude | Logos, colores, tipografías, stickers, patrones y reglas de uso |
| Drive · Editor IA · Referencias | Videos de referencia que subas para esta pieza |

Si la ficha de Notion ya tiene el guion en "Desarrollo", no hace falta pegarlo en el prompt. Antes de pedir el video, chequeá que la ficha esté completa.

## La plantilla

Copiá el bloque, completá lo que está entre \[corchetes\] y pegalo en una sesión de Claude del repo Editor-IA. Las líneas que no te importan, borralas: el editor decide con el design system y te lo avisa en la entrega.

```markdown
Editá un video para [CLIENTE].

PIEZA: [link a la ficha en Notion · Plan de publicaciones]
Tomá objetivo, guion, copy, CTA y tono de Notion y el estilo visual del design system de [CLIENTE].

FORMATO: [Reel 9:16 / 4:5 / 1:1 / 16:9] · [duración, ej. 12–15 s]
MATERIAL: [link de Drive] — usar: [carpetas o clips] — excluir: [carpetas, clips o personas]
TOMAS OBLIGATORIAS: [ej. logo del truck, producto en mano, las dueñas]
REFERENCIA: [link en Referencias + qué tomar de ella, ej. "el ritmo del 0:03 al 0:08"]

VOZ EN OFF: [no / sí: guion exacto o "el de Notion"] · voz: [género, edad, acento, tono]
MÚSICA: [sin música / estilo / link] · volumen: [bajo / medio / protagonista]
AUDIO ORIGINAL: [muteado / ambiente bajo / en primer plano]

SUBTÍTULOS: [modo] · [posición] · [tipografías] · [color + palabras destacadas] · [animación]
TEXTOS EXTRA: [precio, fecha, dirección, zócalos… o "no"]
RITMO: [muy rápido / dinámico / pausado] · cortes con [la voz / el beat / libre]
TRANSICIONES: [corte directo / otra + dónde]
ENTRADA: [arranca con el gancho / intro con logo]
CIERRE: [logo + @handle sobre color de marca / CTA en pantalla / otro]
COLOR Y LUZ: [solo corrección / look: cálido, natural, cine… / referencia]
ELEMENTOS DE MARCA: [stickers, patrón, logo en esquina… o "no"]

ENTREGA: [versiones de formato o largo]
NOTAS: [cualquier cosa que no esté en Notion]
```

Versión corta, cuando la ficha de Notion está completa y te sirve el estilo por defecto de la marca:

```markdown
Editá el video de esta pieza: [link a la ficha en Notion].
Material: [link de Drive] (excluir […]). Formato [9:16], [15 s].
```

## Opciones para cada campo

Usá estos nombres en el prompt: son los que el editor entiende sin ambigüedad.

| Campo | Opciones |
| --- | --- |
| Subtítulos · modo | Palabra por palabra · 2–3 palabras · frase completa · karaoke (frase con la palabra actual resaltada) · sin subtítulos |
| Subtítulos · posición | Fija abajo · fija al medio · dinámica (cada palabra en otro lugar del recuadro) |
| Subtítulos · tipografías | Una sola · todas las del design system alternadas · una para texto y otra para destacados |
| Subtítulos · color | Blanco con destacados en colores de marca · todo en color de marca · negro |
| Subtítulos · legibilidad | Sombra sin caja · contorno · caja de color por palabra · barra de fondo |
| Subtítulos · animación | Pop con rebote · fade · deslizar desde abajo · máquina de escribir · sin animación |
| Ritmo | Muy rápido (0,3–0,6 s por toma) · dinámico (0,6–1,2 s) · pausado (2–4 s) |
| Movimiento de cámara en edición | Push-in lento · punch-in en palabras clave · cámara lenta · timelapse · sin movimiento |
| Transiciones | Corte directo (por defecto) · corte al beat · fundido cruzado · fundido a color · whip pan · zoom · match cut · cortina con color o patrón de marca · glitch · deslizar |
| Entrada | Arranca con el gancho (por defecto) · logo de 0,5 s · cartel con título |
| Cierre | Logo + @handle sobre color de marca (1,5–2 s) · CTA en pantalla · última toma congelada · loop con el inicio |
| Animación de logo y textos | Pop con rebote · fade · deslizar · sello que cae · estático |
| Color y luz | Solo corrección (igualar tomas) · cálido · natural · vibrante · cine (teal & orange) · vintage / film · blanco y negro · "como esta referencia" |
| Retoques | Levantar sombras · recuperar cielos · más brillo y saturación en el producto · cuidar tonos de piel · viñeta · grano |
| Voz en off | Mujer / hombre · joven / adulto · argentino, neutro, inglés · amigable, enérgico, sereno · una voz ya usada ("Julieta") |
| Música | Sin música · estilo (acústico, urbano, latino, lo-fi) · link a un tema · volumen bajo, medio o protagonista |
| Efectos de sonido | Whoosh en transiciones · pop en textos · ninguno |

Por defecto, si no lo pedís: corte directo, arranque con el gancho, cierre con logo, audio a -14 LUFS y textos dentro de la zona segura de Instagram y TikTok.

## Ejemplo: reel LUJI'S Thanksgiving

Así se habría pedido con la plantilla el primer reel que hicimos.

```markdown
Editá un video para LUJI'S.

PIEZA: [link a la ficha "Reel Thanksgiving" en Notion]
Tomá objetivo, guion, copy, CTA y tono de Notion y el estilo visual del design system de LUJI'S.

FORMATO: Reel 9:16 · 10–15 s
MATERIAL: Drive madre de LUJI'S — usar: todas las carpetas, solo video — excluir: 2026/SEPTIEMBRE
TOMAS OBLIGATORIAS: el equipo atendiendo, empanada abierta con relleno, banner "ARGENTINAS"
REFERENCIA: no

VOZ EN OFF: sí, el guion de Notion · voz: mujer argentina, joven, amigable
MÚSICA: sin música
AUDIO ORIGINAL: muteado

SUBTÍTULOS: palabra por palabra · dinámica · todas las del design system · blanco, destacar Thanksgiving, argentina, jueves, Gracias y mejor · sombra sin caja · pop con rebote
TEXTOS EXTRA: no
RITMO: dinámico · cortes con la voz
TRANSICIONES: corte directo
ENTRADA: arranca con el gancho
CIERRE: logo oficial + @luji.miami sobre naranja de marca
COLOR Y LUZ: original de cámara + viñeta suave
ELEMENTOS DE MARCA: 3 garabatos en blanco (bandera, corazones, carita)

ENTREGA: solo 9:16
```

## Cómo pedir cambios a la v1

Un cambio por línea, con el segundo exacto y qué querés en su lugar. Se piden en la misma sesión donde se hizo el video, así el editor reusa todo lo que ya armó.

```markdown
Cambios v1 → v2:
- 0:04 — "argentina" se lee poco: pasala a blanco
- 0:06–0:07 — cambiá la toma por una de clientes comiendo
- 0:10 — el logo más grande y que entre más lento
- General — sumale música acústica a volumen bajo
```

Cuando esté aprobado, pedí la versión final con el nombre `MARCA_Tema_Formato_vN.mp4` y cambiá el estado de la ficha en Notion. Por ahora los videos llegan por el chat: Claude no puede subir a Drive archivos de más de unos pocos MB, así que alguien del equipo los sube a `Editor IA / Resultados Finales`.
