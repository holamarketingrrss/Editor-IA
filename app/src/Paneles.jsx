import React, {useEffect, useRef, useState} from 'react';
import {api} from './api.js';

import {fmt, Icono} from './ui.jsx';
const num = (v) => (v === '' || isNaN(+v) ? 0 : +v);

// ---------- Textos: corregir palabras, color, fuente, tamaño, tiempos y posición ----------
export function Textos({p, data, setData, t, irA, sel, setSel, aplicar, ocupado}) {
  const words = data.words;
  const off = data.voiceOffset;
  const colores = Object.keys(p.brand.colores);
  const fuentes = Object.keys(p.brand.fuentes);
  const sucias = words.some((w) => w._editada);
  const fila = useRef({});
  const actual = words.findIndex((w) => t >= w.start + off && t < w.end + off);
  useEffect(() => { fila.current[actual]?.scrollIntoView({block: 'nearest'}); }, [actual]);

  // selección: clic = una; Shift + clic = rango desde la última; Ctrl/⌘ + clic = sumar o sacar
  const elegir = (e, i) => {
    if (/^(INPUT|SELECT|OPTION)$/.test(e.target.tagName)) { if (!sel.includes(i)) setSel([i]); return; }
    if (e.shiftKey && sel.length) {
      const a = sel[sel.length - 1], rango = Array.from({length: Math.abs(i - a) + 1}, (_, k) => Math.min(a, i) + k);
      setSel([...new Set([...sel, ...rango.filter((k) => k !== i)]), i]);
    } else if (e.metaKey || e.ctrlKey) setSel(sel.includes(i) ? sel.filter((k) => k !== i) : [...sel, i]);
    else { setSel([i]); irA(words[i].start + off + 0.08); }
  };
  // cambio en grupo: fn(palabra) devuelve los campos nuevos; quedan marcados como editados
  const enGrupo = (fn) => setData((d) => ({...d, words: d.words.map((w, j) => {
    if (!sel.includes(j)) return w;
    const c = fn(w); return {...w, ...c, _editada: [...new Set([...(w._editada || []), ...Object.keys(c)])]};
  })}));
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
      <p className="nota">Clic en una fila para ir a esa palabra{modo === 'palabra' ? ' y arrastrarla en la vista previa' : ''}; <b>Shift + clic</b> elige un rango y <b>Ctrl/⌘ + clic</b> suma o saca
        (se mueven y cambian todas juntas). Los cambios se ven al instante;
        <b> Aplicar</b> los guarda (y los vuelve a ubicar dentro de la zona segura).
        {modo !== 'palabra' && ' En este modo de subtítulos la posición la decide el bloque.'}</p>
      <div className="grupo-textos">
        <span className="sub">{sel.length ? `${sel.length} ${sel.length === 1 ? 'palabra elegida' : 'palabras elegidas'}` : 'Ninguna elegida'}</span>
        <button onClick={() => setSel(words.map((_, i) => i))}>Todas</button>
        <button disabled={!sel.length} onClick={() => setSel([])}>Ninguna</button>
        {sel.length > 0 && <>
          <select value="" onChange={(e) => e.target.value && enGrupo(() => ({color: e.target.value}))}>
            <option value="">Color…</option>{colores.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value="" onChange={(e) => e.target.value && enGrupo(() => ({font: e.target.value}))}>
            <option value="">Fuente…</option>{fuentes.map((f) => <option key={f} value={f}>{f} · {p.brand.fuentes[f].familia}</option>)}</select>
          <button title="10 % más chicas" onClick={() => enGrupo((w) => ({size: Math.round(w.size * 0.9)}))}>A−</button>
          <button title="10 % más grandes" onClick={() => enGrupo((w) => ({size: Math.round(w.size * 1.1)}))}>A+</button>
          {modo === 'palabra' && <>
            <button title="Todas en el lugar de la última elegida" onClick={() => { const b = words[sel[sel.length - 1]]; enGrupo(() => ({x: b.x, y: b.y, rot: b.rot})); }}>Mismo lugar</button>
            <button title="Centradas horizontalmente" onClick={() => enGrupo(() => ({x: 540}))}>Centrar</button>
            <button title="Rectas, sin rotación" onClick={() => enGrupo(() => ({rot: 0}))}>Rectas</button>
            <button title="Subir 40 px" onClick={() => enGrupo((w) => ({y: Math.max(220, w.y - 40)}))}>↑</button>
            <button title="Bajar 40 px" onClick={() => enGrupo((w) => ({y: Math.min(1500, w.y + 40)}))}>↓</button>
          </>}
        </>}
      </div>
      <table className="tabla">
        <thead><tr><th>Tiempo</th><th>Texto</th><th>Color</th><th>Fuente</th><th>Tam.</th><th>Inicio</th><th>Fin</th></tr></thead>
        <tbody>
          {words.map((w, i) => (
            <tr key={i} ref={(el) => { fila.current[i] = el; }} onClick={(e) => elegir(e, i)}
              className={(i === actual ? 'actual ' : '') + (sel.includes(i) ? 'elegida ' : '') + (w._editada ? 'editada' : '')}>
              <td className="tiempo-celda">{fmt(w.start + off)}{w.destacado && <i className="punto" title="destacada" />}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
      <div className="acciones">
        <button className="primario" disabled={!sucias || ocupado} onClick={guardar}>Aplicar textos</button>
        <button disabled={!sucias || ocupado} onClick={() => { setData(p.data); setSel([]); }}>Descartar</button>
        {sucias && <span className="sub">{((n) => `${n} ${n === 1 ? 'palabra' : 'palabras'} con cambios sin aplicar`)(words.filter((w) => w._editada).length)}</span>}
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
            {String(f.file).startsWith('escena:')
              ? <button className="muestra-escena" onClick={() => irA(f.start + 0.05)} title="Escena de motion graphics: se edita abajo">{f.file.slice(7)}</button>
              : <img src={api.miniatura(p.id, f.file, f.inPoint)} alt="" onClick={() => irA(f.start + 0.05)} title="Ir a esta toma" />}
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
  ['Subtítulos', [['subtitulos.tamano', 'Tamaño de los textos', 'rango'], ['subtitulos.modo', 'Modo'], ['subtitulos.posicion', 'Posición'],
    ['subtitulos.tipografias', 'Tipografías'], ['subtitulos.fuente', 'Fuente (con «una»)', 'fuente'], ['subtitulos.color', 'Color'],
    ['subtitulos.legibilidad', 'Legibilidad'], ['subtitulos.animacion', 'Animación'], ['subtitulos.puntuacion', 'Puntos y comas']]],
  ['Palabras clave', [['subtitulos.efectoDestacado', 'Efecto'], ['subtitulos.colorDestacado', 'Color', 'color'],
    ['subtitulos.escalaDestacado', 'Tamaño respecto del resto', 'rango'], ['subtitulos.destacar', 'Palabras o frases (separadas por coma)', 'lista']]],
  ['Imagen', [['camara', 'Cámara'], ['transicion.tipo', 'Transición'], ['look', 'Look'], ['vineta', 'Viñeta', 'si'], ['grano', 'Grano', 'si']]],
  ['Entrada y cierre', [['entrada.tipo', 'Entrada'], ['entrada.texto', 'Título de entrada', 'texto'], ['cierre.tipo', 'Cierre'],
    ['cierre.texto', 'Texto del CTA', 'texto'], ['animacionLogo', 'Animación del logo'], ['animacionStickers', 'Animación de stickers']]],
  ['Sonido', [['audio', 'Voz de las tomas'], ['sfx.clave', 'Sonido en palabras clave'], ['sfx.zoom', 'Swoosh en los zooms (cámara «acercar»)', 'si']]],
  ['Extras', [['etiqueta.texto', 'Etiqueta arriba (TEMA · bajada)', 'texto'], ['etiqueta.end', 'Etiqueta hasta (s)', 'numero'],
    ['sfx.whoosh', 'Whoosh en transiciones', 'si'], ['sfx.pop', 'Pop en textos', 'si'], ['logoEsquina', 'Logo en esquina', 'si'],
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

export function Estilo({p, data, setData, opciones, aplicar, guardarPreset, ocupado}) {
  const e = data.estilo || opciones.defaults;
  const cambios = diferencia(p.data.estilo || opciones.defaults, e);
  const poner = (r, v) => {
    let n = ponerRuta(e, r, v);
    if (r.startsWith('zocalo.')) n = {...n, zocalo: {start: 1, end: 3, ...(e.zocalo || {}), [r.split('.')[1]]: v}};
    if (r.startsWith('etiqueta.')) n = {...n, etiqueta: {start: 0, end: 3, ...(e.etiqueta || {}), [r.split('.')[1]]: v}};
    setData((d) => ({...d, estilo: n}));
  };
  return (
    <>
      <p className="nota">Transiciones, look, cierre, etiqueta y extras se ven al instante. Lo de subtítulos y palabras clave (tamaño, modo, posición, colores, frases) se recalcula al aplicar.</p>
      {CAMPOS.map(([grupo, campos]) => (
        <fieldset key={grupo}><legend>{grupo}</legend>
          <div className="form dos">
            {campos.map(([r, nombre, tipo]) => {
              const v = leerRuta(e, r);
              if (tipo === 'si') return <label key={r} className="check"><input type="checkbox" checked={!!v} onChange={(x) => poner(r, x.target.checked)} /> {nombre}</label>;
              if (tipo === 'texto') return <label key={r}>{nombre}<input value={v ?? ''} onChange={(x) => poner(r, x.target.value)} /></label>;
              if (tipo === 'fuente') return <label key={r}>{nombre}<select value={v} onChange={(x) => poner(r, x.target.value)}>
                {Object.entries(p.brand.fuentes).map(([k, f]) => <option key={k} value={k}>{k} · {f.familia}</option>)}</select></label>;
              if (tipo === 'rango') return <label key={r}>{nombre} · {Math.round((v ?? 1) * 100)}%<input type="range" min="0.4" max="1.6" step="0.05" value={v ?? 1}
                onChange={(x) => poner(r, +x.target.value)} /></label>;
              if (tipo === 'color') return <label key={r}>{nombre}<select value={v ?? ''} onChange={(x) => poner(r, x.target.value || null)}>
                <option value="">Los acentos de la marca</option>{[...new Set([...Object.keys(p.brand.colores), ...(v && !p.brand.colores[v] ? [v] : [])])].map((c) => <option key={c} value={c}>{c}</option>)}</select></label>;
              if (tipo === 'lista') return <label key={r} className="ancho">{nombre}<input value={(v ?? []).join(', ')} placeholder="Black Friday, 18 Pro Max, Plan Canje"
                onChange={(x) => poner(r, x.target.value.split(',').map((t) => t.trim()).filter(Boolean))} /></label>;
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
        {p.proyecto.preset && <button disabled={!!Object.keys(cambios).length || ocupado || !p.proyecto.estilo} onClick={guardarPreset}
          title="Lo que cambiaste en esta pieza pasa a ser el estilo por defecto de la marca (menos zócalo, títulos y destacados)">
          Guardar como estilo de {p.proyecto.preset}</button>}
      </div>
      {p.proyecto.preset && <p className="nota">Marca: <b>{p.proyecto.preset}</b>. Lo que no cambies acá lo decide su preset (<code>presets/{p.proyecto.preset}</code>).</p>}
    </>
  );
}

// ---------- Exportar: render.sh con el progreso en vivo ----------
export function Exportar({p, recargar}) {
  const [log, setLog] = useState([]);
  const [estado, setEstado] = useState(null);   // null | 'corriendo' | {ok, revisar, video}
  const [verLog, setVerLog] = useState(false);
  const caja = useRef(null);
  // Remotion escribe "Rendered 120/450"; después viene el audio (loudnorm) y el chequeo
  const progreso = (() => {
    for (let i = log.length - 1; i >= 0; i--) {
      const m = /Rendered (\d+)\/(\d+)/.exec(log[i]) || /(\d+)\/(\d+)\s*(frames|cuadros)/i.exec(log[i]);
      if (m) return {pct: Math.round((+m[1] / +m[2]) * 90), fase: `Video: cuadro ${m[1]} de ${m[2]}`};
      if (/loudnorm|LUFS|audio/i.test(log[i])) return {pct: 94, fase: 'Normalizando el audio'};
    }
    return {pct: 3, fase: 'Preparando'};
  })();
  useEffect(() => { caja.current && (caja.current.scrollTop = caja.current.scrollHeight); }, [log]);
  const empezar = () => {
    setLog([]); setEstado('corriendo');
    const es = api.exportar(p.id);
    es.addEventListener('log', (e) => setLog((l) => [...l.slice(-300), JSON.parse(e.data)]));
    es.addEventListener('fin', (e) => { const r = JSON.parse(e.data); setEstado(r); setVerLog(!r.ok || !!r.revisar); es.close(); recargar(); });
    es.onerror = () => { es.close(); setVerLog(true); setEstado((s) => (s === 'corriendo' ? {ok: false} : s)); };
  };
  return (
    <>
      <p className="nota">Renderiza con Remotion, normaliza a -14 LUFS / -1,5 dBTP y chequea H.264 1080x1920 30 fps. Si dice REVISAR, no se entrega.
        El archivo queda en <code>out/</code> con el nombre MARCA_Tema_Formato_vN.mp4.</p>
      <div className="acciones"><button className="primario" disabled={estado === 'corriendo'} onClick={empezar}><Icono n="descarga" />{estado === 'corriendo' ? 'Exportando…' : 'Exportar video'}</button>
        {log.length > 0 && <button onClick={() => setVerLog((v) => !v)}>{verLog ? 'Ocultar detalle' : 'Ver detalle'}</button>}</div>
      {estado === 'corriendo' && (
        <div className="progreso"><div className="barra-prog"><i style={{width: `${progreso.pct}%`}} /></div><span>{progreso.fase}</span></div>
      )}
      {estado && estado !== 'corriendo' && (
        <div className={'aviso ' + (estado.ok && !estado.revisar ? 'ok' : 'error')}>
          {estado.ok && !estado.revisar ? 'Listo para entregar.' : estado.revisar ? 'Exportado, pero REVISAR (mirá el detalle).' : 'Falló el render (mirá el detalle).'}
          {estado.video && <> <a href={`/salida/${p.id}/${estado.video}`} download>Descargar {estado.video}</a></>}
        </div>
      )}
      {log.length > 0 && verLog && <pre className="log" ref={caja}>{log.join('\n')}</pre>}
      {p.videos.length > 0 && <><h4>Versiones exportadas</h4><ul className="videos">
        {p.videos.map((v) => <li key={v}><a href={`/salida/${p.id}/${v}`} target="_blank" rel="noreferrer">{v}</a></li>)}</ul></>}
    </>
  );
}

// ---------- Escenas de motion graphics (proyecto.json "escenas"): textos, tipo, fondo, duración y orden ----------
const TIPOS_ESCENA = [['titulo', 'Título'], ['lista', 'Lista'], ['numero', 'Número'], ['imagen', 'Imagen'], ['frase', 'Frase'], ['ilustracion', 'Ilustración']];
const DECOR = [['formas', 'Formas'], ['lineas', 'Líneas'], ['puntos', 'Puntos'], ['ninguno', 'Liso']];
// clips del video solo de escenas, como los arma make_clips.py (para ver los cambios al instante)
const clipsDeEscenas = (escenas) => {
  let t = 0;
  return escenas.map((e, i) => { const d = Math.max(0.5, +e.dur || 2.5); const c = {tipo: 'escena', start: +t.toFixed(2), end: +(t + d).toFixed(2), escena: {id: e.id ?? String(i + 1), ...e}}; t += d; return c; });
};

export function Escenas({p, data, setData, irA, aplicar, ocupado}) {
  const inicial = () => (p.proyecto.escenas || []).map((e) => ({...e}));
  const [lista, setLista] = useState(inicial);
  useEffect(() => setLista(inicial()), [p]);
  const sucias = JSON.stringify(lista) !== JSON.stringify(inicial());
  const soloEscenas = !p.edl.length;
  const colores = Object.keys(p.brand.colores);
  // vista previa: con video solo de escenas se rearma la línea de tiempo; si no, se actualiza cada escena en su lugar
  const ver = (nueva) => {
    setLista(nueva);
    setData((d) => {
      if (soloEscenas) {
        const clips = clipsDeEscenas(nueva), fin = clips.length ? clips[clips.length - 1].end : 0;
        const outro = Math.max(0.5, d.duration - d.outroAt);
        return {...d, clips, outroAt: fin, duration: +(fin + outro).toFixed(2)};
      }
      const porId = Object.fromEntries(nueva.map((e, i) => [String(e.id ?? i + 1), e]));
      return {...d, clips: d.clips.map((c) => (c.tipo === 'escena' && porId[String(c.escena.id)] ? {...c, escena: {...c.escena, ...porId[String(c.escena.id)]}} : c))};
    });
  };
  const cambiar = (i, campo, v) => ver(lista.map((e, j) => (j === i ? {...e, [campo]: v} : e)));
  const mover = (i, d) => { const g = [...lista]; [g[i], g[i + d]] = [g[i + d], g[i]]; ver(g); };
  const nuevaId = () => { let n = lista.length + 1; while (lista.some((e) => String(e.id) === 'e' + n)) n++; return 'e' + n; };
  let t = 0;
  return (
    <div className="escenas">
      <p className="nota">Escenas de motion graphics: texto con <code>*palabra*</code> para destacar. Los textos, colores y duraciones se ven al instante;
        <b> Aplicar</b> los guarda en <code>proyecto.json</code>.{!soloEscenas && ' Este video mezcla tomas y escenas: el orden y los tiempos se cambian en Tomas (filas escena:<id>).'}</p>
      {lista.map((e, i) => {
        const desde = t; t += +e.dur || 2.5;
        const tipo = e.tipo || 'titulo';
        return (
          <div key={i} className="escena-tarjeta" style={{'--fondo': p.brand.colores[Array.isArray(e.fondo) ? e.fondo[0] : e.fondo] ?? e.fondo ?? 'var(--tinta-3)'}}>
            <button className="muestra" onClick={() => irA(desde + Math.min(1.5, (+e.dur || 2.5) * 0.7))} title="Ir a esta escena">
              <b>{String(i + 1).padStart(2, '0')}</b><span>{TIPOS_ESCENA.find(([k]) => k === tipo)?.[1]}</span></button>
            <div className="campos">
              <div className="form dos">
                <label>Tipo<select value={tipo} onChange={(x) => cambiar(i, 'tipo', x.target.value)}>{TIPOS_ESCENA.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
                <label>Fondo<select value={Array.isArray(e.fondo) ? e.fondo[0] : e.fondo ?? ''} onChange={(x) => cambiar(i, 'fondo', x.target.value || undefined)}>
                  <option value="">El de la marca</option>{colores.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
                <label>Decoración<select value={e.decor ?? 'formas'} onChange={(x) => cambiar(i, 'decor', x.target.value)}>{DECOR.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
                <label>Dura (s)<input type="number" step="0.1" min="0.5" value={e.dur ?? 2.5} onChange={(x) => cambiar(i, 'dur', num(x.target.value))} /></label>
              </div>
              {tipo === 'ilustracion' ? <div className="form dos">
                <label>Rótulo arriba<input value={e.paso ?? ''} placeholder="PASO 1 · Encendé y acercá" onChange={(x) => cambiar(i, 'paso', x.target.value)} /></label>
                <label>Ilustración (componente)<input value={e.componente ?? ''} onChange={(x) => cambiar(i, 'componente', x.target.value)} /></label>
              </div> : <label className="largo">{tipo === 'lista' ? 'Título de la lista' : tipo === 'numero' ? 'Texto debajo del número' : 'Texto'}
                <textarea rows={2} value={e.texto ?? ''} onChange={(x) => cambiar(i, 'texto', x.target.value)} /></label>}
              {tipo === 'ilustracion' && <p className="sub">El dibujo animado lo escribe Claude en <code>reel/src/ilustraciones.jsx</code>; pedile cambios en la pestaña Claude.</p>}
              {tipo === 'lista' && <label className="largo">Ítems (uno por renglón)
                <textarea rows={3} value={(e.items ?? []).join('\n')} onChange={(x) => cambiar(i, 'items', x.target.value.split('\n'))} /></label>}
              {tipo === 'numero' && <div className="form dos">
                <label>Número<input value={e.numero ?? ''} onChange={(x) => cambiar(i, 'numero', x.target.value)} /></label>
                <label>Antes<input value={e.prefijo ?? ''} placeholder="+ / $" onChange={(x) => cambiar(i, 'prefijo', x.target.value)} /></label>
                <label>Después<input value={e.sufijo ?? ''} placeholder="% / k" onChange={(x) => cambiar(i, 'sufijo', x.target.value)} /></label>
              </div>}
              {tipo === 'frase' && <label className="largo">Autor<input value={e.autor ?? ''} onChange={(x) => cambiar(i, 'autor', x.target.value)} /></label>}
              {tipo === 'imagen' && <label className="largo">Imagen (archivo en raw/)
                <select value={e.img ?? ''} onChange={(x) => cambiar(i, 'img', x.target.value)}><option value="">Elegí…</option>
                  {[...new Set([...(p.imagenes || []), e.img].filter(Boolean))].map((f) => <option key={f}>{f}</option>)}</select></label>}
              {['titulo', 'numero'].includes(tipo) && <label className="largo">Bajada (opcional)<input value={e.sub ?? ''} onChange={(x) => cambiar(i, 'sub', x.target.value)} /></label>}
              <label className="check"><input type="checkbox" checked={!!e.logo} onChange={(x) => cambiar(i, 'logo', x.target.checked)} /> Logo arriba</label>
            </div>
            <div className="botones">
              <button disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">↑</button>
              <button disabled={i === lista.length - 1} onClick={() => mover(i, 1)} title="Bajar">↓</button>
              <button disabled={lista.length === 1} onClick={() => ver(lista.filter((_, j) => j !== i))} title="Quitar">✕</button>
            </div>
          </div>
        );
      })}
      <div className="acciones">
        <button className="primario" disabled={!sucias || ocupado} onClick={() => aplicar(lista)}>Aplicar escenas</button>
        <button disabled={ocupado} onClick={() => ver([...lista, {id: nuevaId(), tipo: 'titulo', texto: 'Texto *nuevo*', dur: 2.5}])}>+ Agregar escena</button>
        <button disabled={!sucias || ocupado} onClick={() => { setLista(inicial()); setData(p.data); }}>Descartar</button>
      </div>
    </div>
  );
}

// ---------- Color: retoque de las tomas (estilo.color, de -100 a 100), con vista previa al instante ----------
const AJUSTES_COLOR = [['exposicion', 'Exposición'], ['contraste', 'Contraste'], ['saturacion', 'Saturación'], ['luces', 'Luces'],
  ['sombras', 'Sombras'], ['temperatura', 'Temperatura (frío ↔ cálido)'], ['tinte', 'Tinte (verde ↔ magenta)']];
const CERO = {exposicion: 0, contraste: 0, saturacion: 0, luces: 0, sombras: 0, temperatura: 0, tinte: 0};
const PUNTOS = [['Natural', CERO], ['Más vivo', {...CERO, contraste: 15, saturacion: 25, luces: 10}], ['Cálido', {...CERO, temperatura: 35, saturacion: 10, sombras: 10}],
  ['Frío', {...CERO, temperatura: -30, contraste: 10}], ['Luminoso', {...CERO, exposicion: 12, sombras: 25, contraste: -5}], ['Dramático', {...CERO, contraste: 35, sombras: -25, saturacion: -10}]];

export function Color({p, data, setData, aplicar, ocupado}) {
  const actual = {...CERO, ...(data.estilo?.color ?? {})};
  const guardado = {...CERO, ...(p.data.estilo?.color ?? {})};
  const sucio = JSON.stringify(actual) !== JSON.stringify(guardado);
  const poner = (c) => setData((d) => ({...d, estilo: {...d.estilo, color: {...CERO, ...(d.estilo?.color ?? {}), ...c}}}));
  return (
    <>
      <p className="nota">Retoque de color de las tomas (las escenas animadas mantienen los colores de la marca). Se ve al instante; <b>Aplicar</b> lo guarda para el render.
        Para combinarlo con un look (cálido, cine, B&N…), elegilo en Estilo.</p>
      <div className="puntos-color">{PUNTOS.map(([n, v]) => <button key={n} className="chip" onClick={() => poner(v)}>{n}</button>)}</div>
      <div className="form deslizadores">
        {AJUSTES_COLOR.map(([k, n]) => (
          <label key={k}>{n}<input type="range" min="-100" max="100" step="1" value={actual[k]} onChange={(e) => poner({[k]: +e.target.value})}
            onDoubleClick={() => poner({[k]: 0})} title="Doble clic: volver a 0" /><span>{actual[k] > 0 ? '+' : ''}{actual[k]}</span></label>
        ))}
      </div>
      <div className="acciones">
        <button className="primario" disabled={!sucio || ocupado} onClick={() => aplicar(actual)}>Aplicar color</button>
        <button disabled={!sucio || ocupado} onClick={() => poner(guardado)}>Descartar</button>
        <button onClick={() => poner(CERO)}>Todo a 0</button>
      </div>
    </>
  );
}
