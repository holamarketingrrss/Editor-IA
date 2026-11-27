// Ilustraciones a medida de ESTE proyecto: una por escena "ilustracion" de proyecto.json ("componente": "<Nombre>").
// Cada una recibe {e, dur, kit}: e = la escena, dur = cuadros que dura (30 por segundo), kit = piezas listas que ya
// toman los colores de la marca: Telefono, Apps, Interruptor, Tilde, Ondas, Vuela, Progreso, Bateria, Tarjeta,
// Checklist, Titulo, Icono (bluetooth, wifi, check, foto, contacto, chat, app, nube, candado, tarjeta, camara,
// estrella, corazon, carrito, reloj, rayo, escudo, ubicacion, mas, flecha, bateria) y entra(frame, desde).
// Coordenadas en px de 1080x1920 (x, y = centro); el dibujo va entre y 330 y 1180: abajo van los subtítulos.
// Fondo, rótulo "PASO n" (e.paso) y subtítulos los pone el editor. Formato completo y ejemplo: docs/escenas.md.
import React from 'react';
import {useCurrentFrame} from 'remotion';

// Ejemplo (se puede borrar): dos teléfonos grandes y centrados que se conectan y se pasan los datos, con contenido en
// las pantallas. Dibujo entre y 380 y 1150; abajo van los subtítulos.
export const Ejemplo = ({kit}) => {
  const frame = useCurrentFrame();
  const {Telefono, Apps, Ondas, Vuela, Progreso, Tilde} = kit;
  return <>
    <Telefono x={330} y={760} w={360} etiqueta="Anterior"><Apps /></Telefono>
    <Telefono x={750} y={760} w={360} etiqueta="Nuevo" desde={6} brillo={frame > 40 ? 1 : 0} texto={frame < 40 ? 'Hola' : null}>
      {frame >= 40 && <Progreso x={180} y={330} w={260} desde={40} dura={50} />}
    </Telefono>
    <Ondas x={540} y={760} desde={10} />
    <Vuela de={[330, 660]} a={[750, 660]} desde={40} />
    {frame > 95 && <Tilde x={750} y={760} size={170} desde={95} />}
  </>;
};
