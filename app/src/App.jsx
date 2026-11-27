import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {Reel, FPS, duracionEnFrames} from '../../template/reel/src/Reel.jsx';
import {api, sesionApi, gestionApi} from './api.js';
import {Login, Equipo} from './Equipo.jsx';
import {Marcas, Ajustes, Guia, Soporte} from './Gestion.jsx';
import {Capas} from './Capas.jsx';
import {Textos, Tomas, Escenas, Audio, Estilo, Color, Exportar} from './Paneles.jsx';
import {Claude} from './Claude.jsx';
import {Icono, Linea, fmt, useAviso} from './ui.jsx';

export {fmt};

// Con equipo configurado pide usuario y clave; sin equipo (una persona en su compu) entra directo.
export function Puerta() {
  const [s, setS] = useState(null);   // {usuario, equipo, motor}
  const ver = () => sesionApi.estado().then(setS).catch(() => setS({usuario: null, equipo: true}));
  useEffect(() => {
    ver();
    const fuera = () => setS((x) => (x ? {...x, usuario: null} : x));
    window.addEventListener('sin-sesion', fuera);
    return () => window.removeEventListener('sin-sesion', fuera);
  }, []);
  if (!s) return <div className="app"><main className="cargando"><span className="pulso" /></main></div>;
  if (!s.usuario) return <Login entro={(u) => setS({...s, usuario: u})} />;
  return <App usuario={s.usuario} equipo={s.equipo} salir={() => sesionApi.salir().finally(() => setS({...s, usuario: null}))} />;
}
const PANELES = [['claude', 'Claude'], ['textos', 'Textos'], ['tomas', 'Tomas'], ['capas', 'Capas'], ['audio', 'Audio'], ['estilo', 'Estilo'], ['color', 'Color'], ['exportar', 'Exportar']];
const nombreProyecto = (id) => id.replace(/-/g, ' ');
const hace = (ms) => {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'recién'; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? 'ayer' : `hace ${d} días`;
};
const escribiendo = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

export function App({usuario, equipo, salir}) {
  const avisar = useAviso();
  const [lista, setLista] = useState([]);
  const [id, setId] = useState(() => new URLSearchParams(location.search).get('p') || '');
  const [p, setP] = useState(null);          // lo que dice el disco
  const [data, setData] = useState(null);    // lo que se ve (con los retoques sin aplicar)
  const [opciones, setOpciones] = useState(null);
  const [panel, setPanel] = useState('claude');
  const [ocupado, setOcupado] = useState('');
  const [frame, setFrame] = useState(0);
  const [sonando, setSonando] = useState(false);
  const [capaSel, setCapaSel] = useState(null);   // capa elegida en Capas: se arrastra en la vista previa
  const [sel, setSel] = useState([]);        // palabras elegidas en Textos (la última es la principal): se arrastran juntas en la vista previa
  const [atajos, setAtajos] = useState(false);
  const [vista, setVista] = useState(() => new URLSearchParams(location.search).get('v') || 'proyectos');
  const player = useRef(null);
  const yoBarra = <Usuario u={usuario} equipo={equipo} salir={salir} abrirEquipo={() => { setId(''); setVista('equipo'); }} />;
  const ir = (v) => { setId(''); setVista(v); };
  const nav = <Nav vista={vista} ir={ir} admin={usuario.rol === 'admin'} />;

  const listar = () => api.proyectos().then(setLista).catch((e) => avisar('error', 'No se pudo leer la lista de proyectos', e.message));
  useEffect(() => { listar(); api.opciones().then(setOpciones).catch(() => {}); }, []);
  const recargar = () => id && api.proyecto(id).then((x) => { setP(x); setData(x.data); }).catch(() => {});
  useEffect(() => {
    history.replaceState(null, '', id ? `?p=${id}` : vista !== 'proyectos' ? `?v=${vista}` : location.pathname);
    setSel([]); setCapaSel(null); setFrame(0); setSonando(false);
    if (!id) { setP(null); setData(null); listar(); return; }
    api.proyecto(id).then((x) => { setP(x); setData(x.data); })
      .catch((e) => { avisar('error', 'No se pudo abrir el proyecto', e.message); setId(''); });
  }, [id, vista]);
  // cuando Claude termina un pedido, se abre el proyecto que armó
  const alTerminar = (proy) => { listar(); if (proy && proy !== id) { setId(proy); setPanel('claude'); } else recargar(); };

  const listo = !!(p && data);
  useEffect(() => {
    const pl = player.current; if (!pl) return;
    const f = (e) => setFrame(e.detail.frame), on = () => setSonando(true), off = () => setSonando(false);
    pl.addEventListener('frameupdate', f); pl.addEventListener('play', on); pl.addEventListener('pause', off); pl.addEventListener('ended', off);
    return () => { pl.removeEventListener('frameupdate', f); pl.removeEventListener('play', on); pl.removeEventListener('pause', off); pl.removeEventListener('ended', off); };
  }, [listo, id]);

  const irA = (seg) => player.current?.seekTo(Math.round(seg * FPS));
  const t = frame / FPS;

  // atajos: espacio reproduce, flechas mueven 1 s (con Shift, un cuadro), Inicio vuelve al principio, ? muestra la ayuda
  useEffect(() => {
    const tecla = (e) => {
      if (escribiendo(e)) return;
      if (e.key === '?') { setAtajos((a) => !a); return; }
      if (e.key === 'Escape') { setAtajos(false); setSel([]); return; }
      const pl = player.current;
      if (!pl || !data) return;
      if (e.code === 'Space') { e.preventDefault(); pl.toggle(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const paso = e.shiftKey ? 1 : FPS, dir = e.key === 'ArrowLeft' ? -1 : 1;
        pl.seekTo(Math.max(0, Math.min(duracionEnFrames(data) - 1, pl.getCurrentFrame() + dir * paso)));
      }
      if (e.key === 'Home') pl.seekTo(0);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [data]);

  // guarda en disco con un script del repo y deja la vista previa igual a lo que quedó
  const aplicar = async (que, fn) => {
    setOcupado(que);
    try {
      const x = await fn();
      setP(x); setData(x.data);
      const zona = (x.log || '').split('\n').filter((l) => /FUERA DE ZONA|CONTRASTE|SUPERPUESTO/.test(l)).map((l) => l.trim());
      if (zona.length) avisar('alerta', `${que}: aplicado, pero revisá`, zona.join('\n'));
      else avisar('ok', `${que}: aplicado`);
    } catch (e) { avisar('error', `${que}: no se pudo aplicar`, e.message); }
    setOcupado('');
  };

  // ilustraciones a medida del proyecto (reel/src/ilustraciones.jsx): se importan del proyecto y se recargan si cambian
  const [ilus, setIlus] = useState({});
  useEffect(() => {
    if (!p?.ilustraciones) { setIlus({}); return; }
    import(/* @vite-ignore */ p.ilustraciones).then((m) => setIlus({...m}))
      .catch((e) => { setIlus({}); avisar('error', 'Las ilustraciones del proyecto tienen un error', e.message); });
  }, [p?.ilustraciones]);
  const props = useMemo(() => data && p && ({data, brand: p.brand, base: `/media/${p.id}/`, ilustraciones: ilus}), [data, p, ilus]);
  const modoPalabra = (data?.estilo?.subtitulos?.modo ?? 'palabra') === 'palabra';
  const principal = sel.length ? sel[sel.length - 1] : null;
  const palabra = panel === 'textos' && modoPalabra && principal !== null ? data?.words[principal] : null;

  // arrastra la palabra principal y mueve todas las elegidas lo mismo (posiciones de partida fijas durante el arrastre)
  const arrastrar = (e) => {
    e.preventDefault(); e.stopPropagation();
    const caja = e.currentTarget.parentElement.getBoundingClientRect();
    const base = Object.fromEntries(sel.map((i) => [i, {x: data.words[i].x ?? 540, y: data.words[i].y ?? 960}]));
    const p0 = base[principal];
    const mover = (ev) => {
      const x = Math.max(0, Math.min(1, (ev.clientX - caja.left) / caja.width)) * 1080;
      const y = Math.max(0, Math.min(1, (ev.clientY - caja.top) / caja.height)) * 1920;
      const dx = x - p0.x, dy = y - p0.y;
      setData((d) => ({...d, words: d.words.map((w, i) => (base[i] ? {...w, x: Math.round(Math.max(0, Math.min(1080, base[i].x + dx))),
        y: Math.round(Math.max(0, Math.min(1920, base[i].y + dy))), _editada: [...new Set([...(w._editada || []), 'x', 'y'])]} : w))}));
    };
    const soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
  };

  // capa visible elegida en Capas: se arrastra en la vista previa (cambia x, y)
  const capa = panel === 'capas' && capaSel !== null ? data?.capas?.[capaSel] : null;
  const capaVisible = capa && capa.tipo !== 'audio' && t >= capa.start && t < capa.end ? capa : null;
  const arrastrarCapa = (e) => {
    e.preventDefault(); e.stopPropagation();
    const caja = e.currentTarget.parentElement.getBoundingClientRect();
    const mover = (ev) => {
      const x = Math.round(Math.max(0, Math.min(1, (ev.clientX - caja.left) / caja.width)) * 1080);
      const y = Math.round(Math.max(0, Math.min(1, (ev.clientY - caja.top) / caja.height)) * 1920);
      setData((d) => ({...d, capas: d.capas.map((c, i) => (i === capaSel ? {...c, x, y} : c))}));
    };
    const soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
  };

  if (!id && vista !== 'proyectos') {
    const pagina = {equipo: <Equipo yo={usuario} volver={() => ir('proyectos')} />, marcas: <Marcas />, ajustes: <Ajustes />,
      guia: <Guia abrirSoporte={() => ir('soporte')} />, soporte: <Soporte />}[vista] ?? null;
    return <div className="app"><Barra>{nav}<span className="espacio" />{yoBarra}</Barra>{pagina}</div>;
  }
  if (!id) return <Inicio lista={lista} abrir={setId} alTerminar={alTerminar} yoBarra={yoBarra} nav={nav} recargar={listar} />;
  if (!p || !props) return <div className="app"><Barra><span className="espacio" />{yoBarra}</Barra><main className="cargando"><span className="pulso" />Abriendo {nombreProyecto(id)}…</main></div>;

  const info = lista.find((x) => x.id === id);
  return (
    <div className="app" style={{'--marca': info?.color || 'var(--amarillo)'}}>
      <Barra>
        <button className="volver" onClick={() => setId('')}><Icono n="atras" /> Proyectos</button>
        <span className="sep">/</span>
        <span className="chip-marca"><i />{p.brand.nombre}</span>
        <h1 className="titulo-proyecto">{nombreProyecto(p.id)}</h1>
        <span className="espacio" />
        {ocupado && <span className="ocupado"><span className="pulso" />{ocupado}…</span>}
        <button className="icono" onClick={() => setAtajos(true)} title="Atajos de teclado (?)" aria-label="Atajos de teclado"><Icono n="teclado" /></button>
        {yoBarra}
      </Barra>
      <main className="editor">
        <section className="vista">
          <div className="marco">
            <Player ref={player} component={Reel} inputProps={props} durationInFrames={duracionEnFrames(data)} fps={FPS}
              compositionWidth={1080} compositionHeight={1920} controls={false} clickToPlay={!palabra && !capaVisible}
              style={{width: '100%', height: '100%'}} acknowledgeRemotionLicense />
            {capaVisible && (
              <div className="capa-arrastre">
                <div className="asa" style={{left: `${(capaVisible.x ?? 540) / 10.8}%`, top: `${(capaVisible.y ?? 960) / 19.2}%`}} onPointerDown={arrastrarCapa} title="Arrastrá para mover la capa">
                  <span>{capaVisible.tipo === 'texto' ? capaVisible.texto.slice(0, 14) : 'imagen'}</span>
                </div>
              </div>
            )}
            {palabra && (
              <div className="capa-arrastre">
                <div className="asa" style={{left: `${(palabra.x ?? 540) / 10.8}%`, top: `${(palabra.y ?? 960) / 19.2}%`}}
                  onPointerDown={arrastrar} title="Arrastrá para mover la palabra">
                  <span>{palabra.frase ?? palabra.text}{sel.length > 1 ? ` + ${sel.length - 1}` : ''}</span>
                </div>
              </div>
            )}
          </div>
          <div className="transporte">
            <button className="play" onClick={() => player.current?.toggle()} aria-label={sonando ? 'Pausa' : 'Reproducir'}>
              <Icono n={sonando ? 'pausa' : 'play'} t={18} />
            </button>
            <span className="reloj"><b>{fmt(t)}</b> / {fmt(data.duration)}</span>
            <span className="espacio" />
            <button className="abrir-lt" onClick={() => setPanel('capas')} title="Línea de tiempo con capas: imágenes, textos y audios"><Icono n="mas" t={14} />Capas</button>
            <span className="dato">{((e) => [data.clips.length - e && `${data.clips.length - e} tomas`, e && `${e} escenas`].filter(Boolean).join(' + '))(data.clips.filter((c) => c.tipo === 'escena').length)} · {data.words.length} palabras</span>
          </div>
          <Linea data={data} t={t} irA={irA} miniatura={(f, s) => api.miniatura(p.id, f, s)}
            colorEscena={(f) => (f ? p.brand.colores[f] ?? f : 'var(--tinta-4)')} />
        </section>
        <section className="panel">
          <nav className="pestanas">
            {PANELES.map(([k, n0], i) => [k, k === 'tomas' && !p.edl.length && p.proyecto.escenas?.length ? 'Escenas' : n0, i]).map(([k, n, i]) => (
              <button key={k} className={panel === k ? 'activo' : ''} onClick={() => setPanel(k)}>
                <small>{String(i + 1).padStart(2, '0')}</small>{n}
              </button>
            ))}
          </nav>
          <div className="contenido" key={panel}>
            {panel === 'claude' && <Claude key={p.id} p={p} t={t} recargar={recargar} alTerminar={alTerminar} />}
            {panel === 'textos' && <Textos p={p} data={data} setData={setData} t={t} irA={irA} sel={sel} setSel={setSel}
              aplicar={(guion) => aplicar('Textos', () => api.guardarGuion(p.id, guion))} ocupado={!!ocupado} />}
            {panel === 'tomas' && p.edl.length > 0 && <Tomas p={p} irA={irA} aplicar={(edl) => aplicar('Tomas', () => api.guardarEdl(p.id, edl))}
              subir={(f) => aplicar('Subir toma', () => api.subir(p.id, 'toma', f))} ocupado={!!ocupado} />}
            {panel === 'tomas' && p.proyecto.escenas?.length > 0 && <Escenas p={p} data={data} setData={setData} irA={irA}
              aplicar={(escenas) => aplicar('Escenas', () => api.guardarProyecto(p.id, {escenas}))} ocupado={!!ocupado} />}
            {panel === 'audio' && <Audio p={p} data={data} setData={setData} opciones={opciones}
              aplicar={(c) => aplicar('Audio', () => api.guardarProyecto(p.id, c))}
              subir={(f) => aplicar('Subir música', () => api.subir(p.id, 'musica', f))} ocupado={!!ocupado} />}
            {panel === 'estilo' && opciones && <Estilo p={p} data={data} setData={setData} opciones={opciones}
              aplicar={(estilo) => aplicar('Estilo', () => api.guardarProyecto(p.id, {estilo}))}
              guardarPreset={() => aplicar('Estilo de la marca', () => api.guardarPreset(p.id))} ocupado={!!ocupado} />}
            {panel === 'capas' && <Capas p={p} data={data} setData={setData} t={t} irA={irA} capaSel={capaSel} setCapaSel={setCapaSel} ocupado={!!ocupado}
              aplicar={(capas) => aplicar('Capas', () => api.guardarProyecto(p.id, {capas}))} />}
            {panel === 'color' && <Color p={p} data={data} setData={setData} ocupado={!!ocupado}
              aplicar={(color) => aplicar('Color', () => api.guardarProyecto(p.id, {estilo: {color}}))} />}
            {panel === 'exportar' && <Exportar p={p} recargar={() => api.proyecto(p.id).then(setP)} />}
          </div>
        </section>
      </main>
      {atajos && <Atajos cerrar={() => setAtajos(false)} />}
    </div>
  );
}

function Barra({children}) {
  return <header className="barra"><span className="marca-app">editor<i>ia</i></span>{children}</header>;
}

function Usuario({u, equipo, salir, abrirEquipo}) {
  if (!equipo) return u.rol === 'admin' ? <button className="icono" onClick={abrirEquipo} title="Equipo: activar el acceso con usuarios" aria-label="Equipo"><Icono n="usuarios" /></button> : null;
  return (
    <span className="usuario">
      {u.rol === 'admin' && <button className="icono" onClick={abrirEquipo} title="Equipo" aria-label="Equipo"><Icono n="usuarios" /></button>}
      <span className="avatar" title={`${u.nombre} · ${u.rol}`}>{u.nombre.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</span>
      <button className="icono" onClick={salir} title="Salir" aria-label="Salir"><Icono n="salir" /></button>
    </span>
  );
}

function Nav({vista, ir, admin}) {
  const items = [['proyectos', 'Proyectos'], ['marcas', 'Marcas'], ['ajustes', 'Ajustes'], ['guia', 'Guía'], ['soporte', 'Soporte']];
  return <nav className="nav-principal">{items.map(([k, n]) => <button key={k} className={vista === k ? 'activo' : ''} onClick={() => ir(k)}>{n}</button>)}</nav>;
}

// menú de cada proyecto en la galería: duplicar, renombrar, eliminar (a la papelera)
function MenuProyecto({x, recargar, abrir}) {
  const avisar = useAviso();
  const [abierto, setAbierto] = useState(false);
  const hacer = async (que, fn) => { setAbierto(false); try { const r = await fn(); await recargar(); avisar('ok', que); return r; } catch (e) { avisar('error', `${que}: no se pudo`, e.message); } };
  return (
    <div className="menu-proyecto" onClick={(e) => e.stopPropagation()}>
      <button className="icono" aria-label="Opciones del proyecto" onClick={() => setAbierto((a) => !a)}>⋯</button>
      {abierto && <div className="menu-caja" onMouseLeave={() => setAbierto(false)}>
        <button onClick={() => { const n = prompt('Nombre de la copia:', `${x.id}-v2`); if (n) hacer('Proyecto duplicado', () => gestionApi.duplicar(x.id, n)).then((r) => r && abrir(r.id)); }}>Duplicar</button>
        <button onClick={() => { const n = prompt('Nombre nuevo:', x.id); if (n && n !== x.id) hacer('Proyecto renombrado', () => gestionApi.renombrar(x.id, n)); }}>Renombrar</button>
        <button className="peligro" onClick={() => confirm(`¿Eliminar «${nombreProyecto(x.id)}»? Va a la papelera y se puede recuperar.`) && hacer('Proyecto en la papelera', () => gestionApi.borrarProyecto(x.id))}>Eliminar</button>
      </div>}
    </div>
  );
}

function Papelera({recargar}) {
  const avisar = useAviso();
  const [lista, setLista] = useState(null);
  const ver = () => gestionApi.papelera().then(setLista).catch(() => setLista([]));
  if (lista === null) return <button className="link-papelera" onClick={ver}>Ver papelera</button>;
  return (
    <div className="papelera">
      <h3>Papelera <button className="icono" onClick={() => setLista(null)} aria-label="Cerrar"><Icono n="x" /></button></h3>
      {!lista.length && <p className="nota">Está vacía.</p>}
      {lista.map((x) => (
        <div key={x.nombre} className="papelera-fila">
          <span className="dato">{x.tipo}</span><b>{nombreProyecto(x.id)}</b><span className="dato">{x.fecha.slice(0, 10)}</span>
          <button onClick={() => gestionApi.recuperar(x.nombre).then((r) => { avisar('ok', `Recuperado: ${r.id}`); ver(); recargar(); }).catch((e) => avisar('error', 'No se pudo', e.message))}>Recuperar</button>
        </div>
      ))}
    </div>
  );
}

function Inicio({lista, abrir, alTerminar, yoBarra, nav, recargar}) {
  const [q, setQ] = useState('');
  const filtrados = lista.filter((x) => (x.id + ' ' + x.marca).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="app inicio">
      <Barra>{nav}<span className="espacio" /><span className="dato">{lista.length} proyectos</span>{yoBarra}</Barra>
      <main className="inicio-grilla">
        <section className="bloque pedido">
          <h2><small>01</small>Pedido <em>nuevo</em></h2>
          <Claude p={null} t={0} alTerminar={alTerminar} />
        </section>
        <section className="bloque proyectos">
          <div className="encabezado">
            <h2><small>02</small>Proyectos</h2>
            <label className="buscar"><Icono n="buscar" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por marca o tema" /></label>
          </div>
          {!lista.length && <p className="nota">Todavía no hay proyectos. Hacé un pedido y aparecen acá.</p>}
          <div className="galeria">
            {filtrados.map((x, i) => (
              <div key={x.id} className="tarjeta-envoltura">
              <MenuProyecto x={x} recargar={recargar} abrir={abrir} />
              <button className="tarjeta" onClick={() => abrir(x.id)} style={{'--marca': x.color, animationDelay: `${Math.min(i, 12) * 35}ms`}}>
                <div className="portada">
                  <img src={`/api/p/${x.id}/portada`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                  <span className="duracion">{x.duracion ? `${x.duracion.toFixed(0)} s` : '—'}</span>
                  {x.videos > 0 && <span className="exportado" title={`${x.videos} versiones exportadas`}><Icono n="ok" t={12} /></span>}
                </div>
                <div className="pie">
                  <span className="chip-marca"><i />{x.marca}</span>
                  <b>{nombreProyecto(x.id)}</b>
                  <span className="dato">{x.tomas} tomas · {hace(x.cambiado)}</span>
                </div>
              </button>
              </div>
            ))}
          </div>
          {lista.length > 0 && !filtrados.length && <p className="nota">Nada coincide con «{q}».</p>}
          <Papelera recargar={recargar} />
        </section>
      </main>
    </div>
  );
}

function Atajos({cerrar}) {
  const filas = [['Espacio', 'reproducir / pausa'], ['← →', 'mover 1 segundo'], ['Shift + ← →', 'mover 1 cuadro'], ['Inicio', 'volver al principio'],
    ['Clic en la línea', 'ir a ese momento'], ['Textos: clic en una fila', 'elegir la palabra y arrastrarla en la vista previa'],
    ['Ctrl/⌘ + Enter', 'mandar el pedido a Claude'], ['Esc', 'cerrar / soltar la palabra'], ['?', 'esta ayuda']];
  return (
    <div className="modal" onClick={cerrar}>
      <div className="caja" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Atajos de teclado">
        <h3>Atajos de teclado</h3>
        <dl>{filas.map(([k, v]) => <React.Fragment key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></React.Fragment>)}</dl>
        <button className="primario" onClick={cerrar}>Listo</button>
      </div>
    </div>
  );
}
