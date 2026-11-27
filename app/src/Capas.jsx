// Capas: imágenes (PNG, JPG…), textos libres y audios que el equipo suma a mano sobre el video, en una línea de tiempo
// con varias filas. Se mueven y se estiran con el mouse; todo se ve al instante y no usa Claude.
// Se guardan en proyecto.json "capas" (formato en template/reel/src/Reel.jsx, componente Capa).
import React, {useRef, useState} from 'react';
import {api} from './api.js';
import {Icono, fmt, useAviso} from './ui.jsx';

const r2 = (v) => Math.round(v * 20) / 20;   // pasos de 0,05 s
const nombreCapa = (c) => (c.tipo === 'texto' ? `«${(c.texto || '').slice(0, 18)}»` : (c.src || '').split('/').pop());

export function Capas({p, data, setData, t, irA, capaSel, setCapaSel, aplicar, ocupado}) {
  const avisar = useAviso();
  const capas = data.capas ?? [];
  const dur = data.duration || 1;
  const [zoom, setZoom] = useState(1);
  const pista = useRef(null);
  const sucio = JSON.stringify(capas) !== JSON.stringify(p.data.capas ?? []);
  const ponerCapas = (fn) => setData((d) => ({...d, capas: fn(d.capas ?? [])}));
  const cambiar = (i, c) => ponerCapas((l) => l.map((x, j) => (j === i ? {...x, ...c} : x)));
  const agregar = (c) => { ponerCapas((l) => [...l, c]); setCapaSel(capas.length); };
  const desde = r2(Math.min(t, Math.max(0, dur - 1)));

  const subir = async (archivo) => {
    try {
      const r = await api.subirCapa(p.id, archivo);
      if (r.tipo === 'audio') agregar({tipo: 'audio', src: r.src, start: desde, end: r2(Math.min(dur, desde + Math.max(0.5, r.dur || 3))), volumen: 0.8, desde: 0});
      else agregar({tipo: 'imagen', src: r.src, start: desde, end: r2(Math.min(dur, desde + 2.5)), x: 540, y: 900, w: 520, rot: 0, opacidad: 1, anim: 'pop'});
      avisar('ok', `${archivo.name} agregado en ${fmt(desde)}`, 'Movelo en la línea de tiempo o arrastralo en la vista previa.');
    } catch (e) { avisar('error', 'No se pudo subir', e.message); }
  };

  // arrastre en la línea de tiempo: mover el bloque entero o estirar un borde
  const arrastrar = (e, i, modo) => {
    e.preventDefault(); e.stopPropagation(); setCapaSel(i);
    const ancho = pista.current.getBoundingClientRect().width, x0 = e.clientX, c0 = capas[i];
    const mover = (ev) => {
      const ds = ((ev.clientX - x0) / ancho) * dur;
      let {start, end} = c0;
      if (modo === 'mover') { const largo = end - start; start = Math.max(0, Math.min(dur - largo, start + ds)); end = start + largo; }
      if (modo === 'inicio') start = Math.max(0, Math.min(end - 0.2, start + ds));
      if (modo === 'fin') end = Math.min(dur, Math.max(start + 0.2, end + ds));
      cambiar(i, {start: r2(start), end: r2(end)});
    };
    const soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
  };
  const buscar = (e) => {
    const r = pista.current.getBoundingClientRect();
    irA(Math.max(0, Math.min(dur - 0.01, ((e.clientX - r.left) / r.width) * dur)));
  };
  const pct = (s) => `${Math.max(0, Math.min(100, (s / dur) * 100))}%`;
  const sel = capaSel !== null ? capas[capaSel] : null;
  const marcas = Array.from({length: Math.floor(dur) + 1}, (_, k) => k);
  const fila = (etiqueta, contenido, extra = '') => (
    <div className={'lt-fila ' + extra}><span className="lt-nombre">{etiqueta}</span><div className="lt-pista">{contenido}</div></div>
  );

  return (
    <div className="capas">
      <p className="nota">Sumá imágenes, textos y audios sobre el video. Se arrastran en la línea de tiempo (el bloque entero o sus bordes) y, las visibles,
        también en la vista previa. No usa Claude: se puede editar siempre.</p>
      <div className="capas-barra">
        <label className="boton"><Icono n="mas" />Imagen<input type="file" accept="image/*" hidden onChange={(e) => { e.target.files[0] && subir(e.target.files[0]); e.target.value = ''; }} /></label>
        <button onClick={() => agregar({tipo: 'texto', texto: 'Texto nuevo', start: desde, end: r2(Math.min(dur, desde + 2)), x: 540, y: 700, size: 110, rot: 0, font: 'G', color: 'texto', anim: 'pop'})}>
          <Icono n="mas" />Texto</button>
        <button onClick={() => agregar({tipo: 'texto', texto: '🔥', start: desde, end: r2(Math.min(dur, desde + 1.5)), x: 760, y: 700, size: 180, rot: -8, anim: 'pop'})}><Icono n="mas" />Emoji</button>
        <label className="boton"><Icono n="mas" />Audio<input type="file" accept="audio/*" hidden onChange={(e) => { e.target.files[0] && subir(e.target.files[0]); e.target.value = ''; }} /></label>
        <span className="espacio" />
        <label className="zoom-lt">Zoom<input type="range" min="1" max="6" step="0.5" value={zoom} onChange={(e) => setZoom(+e.target.value)} /></label>
      </div>

      <div className="lt-scroll">
        <div className="lt" style={{width: `${zoom * 100}%`}}>
          {fila('', <div className="lt-regla" ref={pista} onPointerDown={buscar}>
            {marcas.map((k) => <span key={k} style={{left: pct(k)}}>{k % (zoom > 2 ? 1 : 2) === 0 ? `${k}s` : ''}</span>)}</div>, 'regla')}
          {fila('Tomas', data.clips.map((c, i) => <div key={i} className={'lt-bloque toma' + (c.tipo === 'escena' ? ' escena' : '')} style={{left: pct(c.start), width: pct(c.end - c.start)}}
            onClick={() => irA(c.start + 0.05)}>{String(i + 1).padStart(2, '0')}</div>))}
          {fila('Textos', data.words.filter((w) => !w.oculta).map((w, i) => <div key={i} className={'lt-palabra' + (w.destacado ? ' destacada' : '')} title={w.frase ?? w.text}
            style={{left: pct(w.start + (data.voiceOffset || 0)), width: pct(Math.max(0.05, w.end - w.start))}} />))}
          {capas.map((c, i) => fila(
            <button className={'lt-capa-nombre' + (capaSel === i ? ' activo' : '')} onClick={() => setCapaSel(i)} title={nombreCapa(c)}>
              <Icono n={c.tipo === 'audio' ? 'reloj' : c.tipo === 'texto' ? 'chispa' : 'buscar'} t={12} />{nombreCapa(c)}</button>,
            <div className={`lt-bloque capa ${c.tipo}` + (capaSel === i ? ' elegido' : '')} style={{left: pct(c.start), width: pct(c.end - c.start)}}
              onPointerDown={(e) => arrastrar(e, i, 'mover')}>
              <i className="borde izq" onPointerDown={(e) => arrastrar(e, i, 'inicio')} />
              <span>{nombreCapa(c)}</span>
              <i className="borde der" onPointerDown={(e) => arrastrar(e, i, 'fin')} />
            </div>, 'capa-fila'))}
          {data.voz !== false && fila('Voz', <div className="lt-bloque voz" style={{left: pct(data.voiceOffset || 0), width: pct(dur - (data.voiceOffset || 0))}}>voz</div>)}
          {data.music && fila('Música', <div className="lt-bloque musica" style={{left: 0, width: '100%'}}>{data.music.replace('musica/', '')}</div>)}
          <div className="lt-cabezal" style={{left: `calc(110px + (100% - 110px) * ${Math.min(1, t / dur)})`}} />
        </div>
      </div>

      {sel ? <Inspector c={sel} p={p} dur={dur} cambiar={(c) => cambiar(capaSel, c)}
        borrar={() => { ponerCapas((l) => l.filter((_, j) => j !== capaSel)); setCapaSel(null); }}
        duplicar={() => agregar({...sel, start: r2(Math.min(dur - 0.5, sel.start + 0.5)), end: r2(Math.min(dur, sel.end + 0.5))})}
        mover={(k) => { const j = capaSel + k; if (j < 0 || j >= capas.length) return; ponerCapas((l) => { const g = [...l]; [g[capaSel], g[j]] = [g[j], g[capaSel]]; return g; }); setCapaSel(j); }} />
        : capas.length > 0 && <p className="sub">Elegí una capa (en su nombre o su bloque) para ajustarla.</p>}

      <div className="acciones">
        <button className="primario" disabled={!sucio || ocupado} onClick={() => aplicar(capas)}>Aplicar capas</button>
        <button disabled={!sucio || ocupado} onClick={() => { setData((d) => ({...d, capas: p.data.capas ?? []})); setCapaSel(null); }}>Descartar</button>
      </div>
    </div>
  );
}

function Inspector({c, p, dur, cambiar, borrar, duplicar, mover}) {
  const num = (k, v) => cambiar({[k]: v === '' ? 0 : +v});
  const colores = Object.keys(p.brand.colores), fuentes = Object.keys(p.brand.fuentes);
  return (
    <fieldset className="inspector"><legend>{c.tipo === 'audio' ? 'Audio' : c.tipo === 'texto' ? 'Texto' : 'Imagen'}</legend>
      <div className="form dos">
        {c.tipo === 'texto' && <label className="ancho">Texto<textarea rows={2} value={c.texto} onChange={(e) => cambiar({texto: e.target.value})} /></label>}
        <label>Empieza (s)<input type="number" step="0.05" min="0" value={c.start} onChange={(e) => num('start', Math.min(+e.target.value, c.end - 0.2))} /></label>
        <label>Termina (s)<input type="number" step="0.05" value={c.end} onChange={(e) => num('end', Math.min(dur, Math.max(+e.target.value, c.start + 0.2)))} /></label>
        {c.tipo === 'audio' ? <>
          <label>Volumen · {Math.round((c.volumen ?? 0.8) * 100)}%<input type="range" min="0" max="1.5" step="0.05" value={c.volumen ?? 0.8} onChange={(e) => num('volumen', e.target.value)} /></label>
          <label>Saltear del principio (s)<input type="number" step="0.1" min="0" value={c.desde ?? 0} onChange={(e) => num('desde', e.target.value)} /></label>
        </> : <>
          {c.tipo === 'imagen'
            ? <label>Ancho · {c.w}px<input type="range" min="60" max="1080" step="10" value={c.w ?? 500} onChange={(e) => num('w', e.target.value)} /></label>
            : <label>Tamaño · {c.size}px<input type="range" min="30" max="400" step="5" value={c.size ?? 110} onChange={(e) => num('size', e.target.value)} /></label>}
          <label>Rotación · {c.rot ?? 0}°<input type="range" min="-45" max="45" step="1" value={c.rot ?? 0} onChange={(e) => num('rot', e.target.value)} /></label>
          <label>Opacidad · {Math.round((c.opacidad ?? 1) * 100)}%<input type="range" min="0.1" max="1" step="0.05" value={c.opacidad ?? 1} onChange={(e) => num('opacidad', e.target.value)} /></label>
          <label>Entrada<select value={c.anim ?? 'pop'} onChange={(e) => cambiar({anim: e.target.value})}>
            {[['pop', 'Pop'], ['fade', 'Fundido'], ['deslizar', 'Deslizar'], ['no', 'Sin animación']].map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <label>X<input type="number" step="10" value={c.x ?? 540} onChange={(e) => num('x', e.target.value)} /></label>
          <label>Y<input type="number" step="10" value={c.y ?? 960} onChange={(e) => num('y', e.target.value)} /></label>
          {c.tipo === 'texto' && <>
            <label>Fuente<select value={c.font ?? 'G'} onChange={(e) => cambiar({font: e.target.value})}>{fuentes.map((f) => <option key={f} value={f}>{f} · {p.brand.fuentes[f].familia}</option>)}</select></label>
            <label>Color<select value={c.color ?? 'texto'} onChange={(e) => cambiar({color: e.target.value})}>{colores.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label>Caja detrás<select value={c.caja ? (c.caja === true ? 'acento' : c.caja) : ''} onChange={(e) => cambiar({caja: e.target.value || false})}>
              <option value="">Sin caja (sombra)</option>{colores.map((k) => <option key={k}>{k}</option>)}</select></label>
          </>}
        </>}
      </div>
      <div className="botones-fila">
        <button title="Más arriba (delante)" onClick={() => mover(1)}>Adelante</button>
        <button title="Más abajo (detrás)" onClick={() => mover(-1)}>Atrás</button>
        <button onClick={duplicar}>Duplicar</button>
        <button className="peligro" onClick={borrar}>Quitar</button>
      </div>
    </fieldset>
  );
}
