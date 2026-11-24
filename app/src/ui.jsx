// Piezas de interfaz compartidas: notificaciones, línea de tiempo, íconos.
import React, {createContext, useCallback, useContext, useRef, useState} from 'react';

export const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

// ---------- Notificaciones (abajo a la derecha; las de error quedan hasta cerrarlas)
const Ctx = createContext(() => {});
export const useAviso = () => useContext(Ctx);
export function Avisos({children}) {
  const [lista, setLista] = useState([]);
  const n = useRef(0);
  const avisar = useCallback((tipo, titulo, detalle) => {
    const id = ++n.current;
    setLista((l) => [...l.slice(-3), {id, tipo, titulo, detalle}]);
    if (tipo !== 'error') setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), tipo === 'alerta' ? 9000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="avisos" aria-live="polite">
        {lista.map((a) => (
          <div key={a.id} className={'toast ' + a.tipo}>
            <Icono n={a.tipo === 'ok' ? 'ok' : a.tipo === 'error' ? 'x' : 'alerta'} />
            <div><b>{a.titulo}</b>{a.detalle && <pre>{a.detalle}</pre>}</div>
            <button className="cerrar" onClick={() => setLista((l) => l.filter((x) => x.id !== a.id))} aria-label="Cerrar">×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

// ---------- Íconos (trazo simple, heredan el color)
const P = {
  play: 'M7 5l12 7-12 7z', pausa: 'M7 5h3v14H7zM14 5h3v14h-3z', ok: 'M5 12l4 4 10-10', x: 'M6 6l12 12M18 6L6 18',
  alerta: 'M12 4l9 16H3zM12 10v4M12 17v.5', mas: 'M12 5v14M5 12h14', atras: 'M15 5l-7 7 7 7', buscar: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4 4',
  chispa: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6', teclado: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8',
  descarga: 'M12 4v11M7 10l5 5 5-5M5 20h14', usuarios: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11', candado: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', reloj: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2',
};
export const Icono = ({n, t = 16}) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill={n === 'play' || n === 'pausa' ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
);

// ---------- Línea de tiempo: tomas (con miniatura), palabras y cierre; clic o arrastre para moverse
export function Linea({data, t, irA, miniatura}) {
  const ref = useRef(null);
  const dur = data.duration || 1, off = data.voiceOffset || 0;
  const pct = (s) => `${Math.max(0, Math.min(100, (s / dur) * 100))}%`;
  const buscar = (e) => {
    const r = ref.current.getBoundingClientRect();
    irA(Math.max(0, Math.min(dur - 0.01, ((e.clientX - r.left) / r.width) * dur)));
  };
  const arrastrar = (e) => {
    buscar(e);
    const mover = (ev) => buscar(ev), soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
  };
  return (
    <div className="linea" ref={ref} onPointerDown={arrastrar} role="slider" aria-label="Línea de tiempo" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={t}>
      <div className="pista tomas">
        {data.clips.map((c, i) => (
          <div key={i} className="toma-bloque" style={{left: pct(c.start), width: pct(c.end - c.start)}} title={`Toma ${i + 1} · ${c.src || c.file}`}>
            {miniatura && c.src && <img src={miniatura(c.src, c.inPoint)} alt="" draggable={false} />}
            <span>{String(i + 1).padStart(2, '0')}</span>
          </div>
        ))}
        {data.outroAt < dur && <div className="toma-bloque cierre" style={{left: pct(data.outroAt), width: pct(dur - data.outroAt)}}><span>cierre</span></div>}
      </div>
      <div className="pista palabras">
        {data.words.map((w, i) => (
          <div key={i} className={'palabra-marca' + (w.destacado ? ' destacada' : '')} style={{left: pct(w.start + off), width: pct(Math.max(0.05, w.end - w.start))}} title={w.text} />
        ))}
      </div>
      <div className="cabezal" style={{left: pct(t)}} />
    </div>
  );
}
