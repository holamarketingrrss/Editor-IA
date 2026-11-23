import React, {useEffect, useRef, useState} from 'react';
import {api} from './api.js';

const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const num = (v) => (v === '' || isNaN(+v) ? 0 : +v);

// ---------- Textos: corregir palabras, color, fuente, tamaño, tiempos y posición ----------
export function Textos({p, data, setData, t, irA, mover, setMover, aplicar, ocupado}) {
  const words = data.words;
  const off = data.voiceOffset;
  const colores = Object.keys(p.brand.colores);
  const fuentes = Object.keys(p.brand.fuentes);
  const sucias = words.some((w) => w._editada);
  const fila = useRef({});
  const actual = words.findIndex((w) => t >= w.start + off && t < w.end + off);
  useEffect(() => { fila.current[actual]?.scrollIntoView({block: 'nearest'}); }, [actual]);

  const editar = (i, campo, valor) => setData((d) => ({...d, words: d.words.map((w, j) => (j === i
    ? {...w, [campo]: valor, _editada: [...new Set([...(w._editada || []), campo])]} : w))}));
  const guardar = () => {
    // solo se escribe en guion.json lo que se tocó: el resto lo sigue decidiendo el estilo
    const guion = words.map((w, i) => {
      const g = {...(p.guion[i] || {})};
      (w._editada || []).forEach((k) => { g[k] = w[k]; });
      return g;
    });
    aplicar(guion);
  };
  if (!words.length) return <p className="nota">Este proyecto no tiene palabras (falta la voz transcrita: scripts/voz.sh).</p>;
  const modo = data.estilo?.subtitulos?.modo ?? 'palabra';
  return (
    <>
      <p className="nota">Clic en el tiempo para ir a la palabra. Los cambios se ven al instante; <b>Aplicar</b> los guarda (y los vuelve a ubicar dentro de la zona segura).
        {modo !== 'palabra' && ' En este modo de subtítulos la posición la decide el bloque: mover no aplica.'}</p>
      <table className="tabla">
        <thead><tr><th>Tiempo</th><th>Texto</th><th>Color</th><th>Fuente</th><th>Tam.</th><th>Inicio</th><th>Fin</th><th /></tr></thead>
        <tbody>
          {words.map((w, i) => (
            <tr key={i} ref={(el) => { fila.current[i] = el; }} className={(i === actual ? 'actual ' : '') + (w._editada ? 'editada' : '')}>
              <td><button className="link" onClick={() => irA(w.start + off + 0.05)}>{fmt(w.start + off)}</button></td>
              <td><input value={w.text} onChange={(e) => editar(i, 'text', e.target.value)} /></td>
              <td>
                <select value={w.color} onChange={(e) => editar(i, 'color', e.target.value)} style={{borderLeft: `14px solid ${p.brand.colores[w.color] ?? w.color}`}}>
                  {[...new Set([...colores, w.color])].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td><select value={w.font} onChange={(e) => editar(i, 'font', e.target.value)}>
                {fuentes.map((f) => <option key={f} value={f}>{f} · {p.brand.fuentes[f].familia}</option>)}</select></td>
              <td><input type="number" className="corto" value={w.size} onChange={(e) => editar(i, 'size', num(e.target.value))} /></td>
              <td><input type="number" step="0.05" className="corto" value={w.start} onChange={(e) => editar(i, 'start', num(e.target.value))} /></td>
              <td><input type="number" step="0.05" className="corto" value={w.end} onChange={(e) => editar(i, 'end', num(e.target.value))} /></td>
              <td>{modo === 'palabra' && <button title="Ubicar con un clic en la vista previa" className={mover === i ? 'activo' : ''}
                onClick={() => { irA(w.start + off + 0.1); setMover(mover === i ? null : i); }}>Mover</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="acciones">
        <button className="primario" disabled={!sucias || ocupado} onClick={guardar}>Aplicar textos</button>
        <button disabled={!sucias || ocupado} onClick={() => setData(p.data)}>Descartar</button>
      </div>
    </>
  );
}

// ---------- Tomas: reemplazar, recortar, reordenar (edl.tsv) ----------
export function Tomas({p, irA, aplicar, subir, ocupado}) {
  const inicial = () => p.edl.map((c) => ({...c, dur: +(c.end - c.start).toFixed(2)}));
  const [filas, setFilas] = useState(inicial);
  useEffect(() => setFilas(inicial()), [p]);
  const sucias = JSON.stringify(filas.map(({dur, file, inPoint, pos}) => [dur, file, +inPoint, pos]))
    !== JSON.stringify(inicial().map(({dur, file, inPoint, pos}) => [dur, file, +inPoint, pos]));
  const cambiar = (i, campo, v) => setFilas((f) => f.map((x, j) => (j === i ? {...x, [campo]: v} : x)));
  const mover = (i, d) => setFilas((f) => { const g = [...f]; [g[i], g[i + d]] = [g[i + d], g[i]]; return g; });
  let t = 0;
  const conTiempos = filas.map((f) => { const r = {...f, start: t, end: t + num(f.dur)}; t += num(f.dur); return r; });
  return (
    <>
      <p className="nota">Cada toma: qué archivo de <code>raw/</code>, desde qué segundo y cuánto dura. El orden de la lista es el del reel.
        Los cambios se ven después de <b>Aplicar</b> (recorta solo las tomas que cambiaron).</p>
      <div className="tomas">
        {conTiempos.map((f, i) => (
          <div key={i} className="toma">
            <img src={api.miniatura(p.id, f.file, f.inPoint)} alt="" onClick={() => irA(f.start + 0.05)} title="Ir a esta toma" />
            <div className="campos">
              <div className="fila"><b>{i + 1}</b><span className="sub">{fmt(f.start)} → {fmt(f.end)}</span></div>
              <select value={f.file} onChange={(e) => cambiar(i, 'file', e.target.value)}>
                {[...new Set([...p.tomas, f.file])].map((x) => <option key={x}>{x}</option>)}
              </select>
              <div className="fila">
                <label>Desde <input type="number" step="0.1" className="corto" value={f.inPoint} onChange={(e) => cambiar(i, 'inPoint', e.target.value)} /> s</label>
                <label>Dura <input type="number" step="0.1" className="corto" value={f.dur} onChange={(e) => cambiar(i, 'dur', e.target.value)} /> s</label>
              </div>
            </div>
            <div className="botones">
              <button disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">↑</button>
              <button disabled={i === filas.length - 1} onClick={() => mover(i, 1)} title="Bajar">↓</button>
              <button disabled={filas.length === 1} onClick={() => setFilas((x) => x.filter((_, j) => j !== i))} title="Quitar">✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="acciones">
        <button className="primario" disabled={!sucias || ocupado} onClick={() => aplicar(conTiempos)}>Aplicar tomas</button>
        <button disabled={ocupado || !p.tomas.length} onClick={() => setFilas((x) => [...x, {file: p.tomas[0], inPoint: 0, dur: 1.5, pos: ''}])}>+ Agregar toma</button>
        <button disabled={!sucias || ocupado} onClick={() => setFilas(inicial())}>Descartar</button>
        <label className="boton">Subir video a raw/<input type="file" accept="video/*" hidden onChange={(e) => e.target.files[0] && subir(e.target.files[0])} /></label>
      </div>
      <p className="nota">Duración total: {fmt(t)}. El cierre ocupa los últimos segundos.</p>
    </>
  );
}

// ---------- Audio: volúmenes, música y audio original ----------
export function Audio({p, data, setData, opciones, aplicar, subir, ocupado}) {
  const pr = p.proyecto;
  const ini = {voz: data.vozVolume ?? 1, music: pr.music || '', musica: pr.musicVolume ?? 0.18, original: data.estilo?.audioOriginal ?? 'mute'};
  const [a, setA] = useState(ini);
  useEffect(() => setA({voz: p.data.vozVolume ?? 1, music: p.proyecto.music || '', musica: p.proyecto.musicVolume ?? 0.18,
    original: p.data.estilo?.audioOriginal ?? 'mute'}), [p]);
  const cambiar = (campo, v) => {
    const n = {...a, [campo]: v}; setA(n);
    setData((d) => ({...d, vozVolume: n.voz, music: n.music || undefined, musicVolume: n.musica}));
  };
  return (
    <>
      <div className="form">
        <label>Voz <input type="range" min="0" max="1.5" step="0.05" value={a.voz} onChange={(e) => cambiar('voz', +e.target.value)} /> <span>{Math.round(a.voz * 100)}%</span></label>
        <label>Música <select value={a.music} onChange={(e) => cambiar('music', e.target.value)}>
          <option value="">Sin música</option>{p.musicas.map((m) => <option key={m} value={m}>{m.replace('musica/', '')}</option>)}</select></label>
        <label>Volumen música <input type="range" min="0" max="1" step="0.02" value={a.musica} onChange={(e) => cambiar('musica', +e.target.value)} />
          <span>{a.musica <= 0.15 ? 'bajo' : a.musica <= 0.35 ? 'medio' : 'protagonista'} ({Math.round(a.musica * 100)}%)</span></label>
        <label>Audio original <select value={a.original} onChange={(e) => setA({...a, original: e.target.value})}>
          {(opciones?.opciones.audioOriginal ?? ['mute', 'bajo', 'alto']).map((o) => <option key={o} value={o}>{{mute: 'muteado', bajo: 'ambiente bajo', alto: 'en primer plano'}[o] ?? o}</option>)}
        </select></label>
      </div>
      <p className="nota">Voz y música se escuchan al instante en la vista previa. El audio original se aplica al guardar (recorta las tomas con sonido).
        El render final normaliza todo a -14 LUFS.</p>
      <div className="acciones">
        <button className="primario" disabled={ocupado} onClick={() => aplicar({vozVolume: a.voz, music: a.music || null, musicVolume: a.musica, estilo: {audioOriginal: a.original}})}>Aplicar audio</button>
        <label className="boton">Subir música<input type="file" accept="audio/*" hidden onChange={(e) => e.target.files[0] && subir(e.target.files[0])} /></label>
      </div>
    </>
  );
}

// ---------- Estilo: las opciones del brief (scripts/estilo.py) ----------
const CAMPOS = [
  ['Subtítulos', [['subtitulos.modo', 'Modo'], ['subtitulos.posicion', 'Posición'], ['subtitulos.tipografias', 'Tipografías'],
    ['subtitulos.color', 'Color'], ['subtitulos.legibilidad', 'Legibilidad'], ['subtitulos.animacion', 'Animación']]],
  ['Imagen', [['camara', 'Cámara'], ['transicion.tipo', 'Transición'], ['look', 'Look'], ['vineta', 'Viñeta', 'si'], ['grano', 'Grano', 'si']]],
  ['Entrada y cierre', [['entrada.tipo', 'Entrada'], ['entrada.texto', 'Título de entrada', 'texto'], ['cierre.tipo', 'Cierre'],
    ['cierre.texto', 'Texto del CTA', 'texto'], ['animacionLogo', 'Animación del logo']]],
  ['Extras', [['sfx.whoosh', 'Whoosh en transiciones', 'si'], ['sfx.pop', 'Pop en textos', 'si'], ['logoEsquina', 'Logo en esquina', 'si'],
    ['zocalo.texto', 'Zócalo (texto)', 'texto'], ['zocalo.start', 'Zócalo desde (s)', 'numero'], ['zocalo.end', 'Zócalo hasta (s)', 'numero']]],
];
const leerRuta = (o, r) => r.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const ponerRuta = (o, r, v) => {
  const [k, ...resto] = r.split('.');
  return {...o, [k]: resto.length ? ponerRuta(o?.[k] ?? {}, resto.join('.'), v) : v};
};
// solo lo que cambió respecto de lo guardado: el resto lo sigue decidiendo el preset de la marca
const diferencia = (a, b) => {
  const out = {};
  for (const k of Object.keys(b)) {
    if (k === 'layout') continue;
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a?.[k] && typeof a[k] === 'object') {
      const d = diferencia(a[k], b[k]); if (Object.keys(d).length) out[k] = d;
    } else if (JSON.stringify(a?.[k]) !== JSON.stringify(b[k])) out[k] = b[k];
  }
  return out;
};

export function Estilo({p, data, setData, opciones, aplicar, ocupado}) {
  const e = data.estilo || opciones.defaults;
  const cambios = diferencia(p.data.estilo || opciones.defaults, e);
  const poner = (r, v) => {
    let n = ponerRuta(e, r, v);
    if (r.startsWith('zocalo.')) n = {...n, zocalo: {start: 1, end: 3, ...(e.zocalo || {}), [r.split('.')[1]]: v}};
    setData((d) => ({...d, estilo: n}));
  };
  return (
    <>
      <p className="nota">Transiciones, look, cierre y extras se ven al instante. Lo de subtítulos (modo, posición, tipografías, color) se recalcula al aplicar.</p>
      {CAMPOS.map(([grupo, campos]) => (
        <fieldset key={grupo}><legend>{grupo}</legend>
          <div className="form dos">
            {campos.map(([r, nombre, tipo]) => {
              const v = leerRuta(e, r);
              if (tipo === 'si') return <label key={r} className="check"><input type="checkbox" checked={!!v} onChange={(x) => poner(r, x.target.checked)} /> {nombre}</label>;
              if (tipo === 'texto') return <label key={r}>{nombre}<input value={v ?? ''} onChange={(x) => poner(r, x.target.value)} /></label>;
              if (tipo === 'numero') return <label key={r}>{nombre}<input type="number" step="0.1" value={v ?? ''} onChange={(x) => poner(r, num(x.target.value))} /></label>;
              return <label key={r}>{nombre}<select value={v} onChange={(x) => poner(r, x.target.value)}>
                {(opciones.opciones[r] || []).map((o) => <option key={o}>{o}</option>)}</select></label>;
            })}
          </div>
        </fieldset>
      ))}
      <div className="acciones">
        <button className="primario" disabled={!Object.keys(cambios).length || ocupado} onClick={() => aplicar(cambios)}>Aplicar estilo</button>
        <button disabled={!Object.keys(cambios).length || ocupado} onClick={() => setData((d) => ({...d, estilo: p.data.estilo}))}>Descartar</button>
      </div>
    </>
  );
}

// ---------- Exportar: render.sh con el progreso en vivo ----------
export function Exportar({p, recargar}) {
  const [log, setLog] = useState([]);
  const [estado, setEstado] = useState(null);   // null | 'corriendo' | {ok, revisar, video}
  const caja = useRef(null);
  useEffect(() => { caja.current && (caja.current.scrollTop = caja.current.scrollHeight); }, [log]);
  const empezar = () => {
    setLog([]); setEstado('corriendo');
    const es = api.exportar(p.id);
    es.addEventListener('log', (e) => setLog((l) => [...l.slice(-300), JSON.parse(e.data)]));
    es.addEventListener('fin', (e) => { setEstado(JSON.parse(e.data)); es.close(); recargar(); });
    es.onerror = () => { es.close(); setEstado((s) => (s === 'corriendo' ? {ok: false} : s)); };
  };
  return (
    <>
      <p className="nota">Renderiza con Remotion, normaliza a -14 LUFS / -1,5 dBTP y chequea H.264 1080x1920 30 fps. Si dice REVISAR, no se entrega.
        El archivo queda en <code>out/</code> con el nombre MARCA_Tema_Formato_vN.mp4.</p>
      <div className="acciones"><button className="primario" disabled={estado === 'corriendo'} onClick={empezar}>{estado === 'corriendo' ? 'Exportando…' : 'Exportar video'}</button></div>
      {estado && estado !== 'corriendo' && (
        <div className={'aviso ' + (estado.ok && !estado.revisar ? 'ok' : 'error')}>
          {estado.ok && !estado.revisar ? 'Listo para entregar.' : estado.revisar ? 'Exportado, pero REVISAR (ver abajo).' : 'Falló el render (ver abajo).'}
          {estado.video && <> <a href={`/salida/${p.id}/${estado.video}`} download>Descargar {estado.video}</a></>}
        </div>
      )}
      {log.length > 0 && <pre className="log" ref={caja}>{log.join('\n')}</pre>}
      {p.videos.length > 0 && <><h4>Versiones exportadas</h4><ul className="videos">
        {p.videos.map((v) => <li key={v}><a href={`/salida/${p.id}/${v}`} target="_blank" rel="noreferrer">{v}</a></li>)}</ul></>}
    </>
  );
}
