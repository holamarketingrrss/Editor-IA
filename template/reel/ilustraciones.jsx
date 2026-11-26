// Ilustraciones a medida de ESTE proyecto: una por escena "ilustracion" de proyecto.json ("componente": "<Nombre>").
// Cada una recibe {e, dur, kit}: e = la escena, dur = cuadros que dura (30 por segundo), kit = piezas listas que ya
// toman los colores de la marca: Telefono, Apps, Interruptor, Tilde, Ondas, Vuela, Progreso, Bateria, Tarjeta,
// Checklist, Titulo, Icono (bluetooth, wifi, check, foto, contacto, chat, app, nube, candado, tarjeta, camara,
// estrella, corazon, carrito, reloj, rayo, escudo, ubicacion, mas, flecha, bateria) y entra(frame, desde).
// Coordenadas en px de 1080x1920 (x, y = centro); el dibujo va entre y 330 y 1180: abajo van los subtítulos.
// Fondo, rótulo "PASO n" (e.paso) y subtítulos los pone el editor. Formato completo y ejemplo: docs/escenas.md.
import React from 'react';
import {useCurrentFrame} from 'remotion';

// Ejemplo (se puede borrar): dos teléfonos que se conectan y se pasan los datos.
export const Ejemplo = ({kit}) => {
  const frame = useCurrentFrame();
  const {Telefono, Apps, Ondas, Vuela, Tilde} = kit;
  return <>
    <Telefono x={330} y={720} w={300} etiqueta="Anterior"><Apps /></Telefono>
    <Telefono x={750} y={720} w={300} etiqueta="Nuevo" desde={6} brillo={frame > 40 ? 1 : 0} />
    <Ondas x={540} y={720} desde={10} />
    <Vuela de={[330, 640]} a={[750, 640]} desde={20} />
    {frame > 60 && <Tilde x={750} y={720} size={170} desde={60} />}
  </>;
};
