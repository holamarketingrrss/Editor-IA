import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {Reel, FPS, duracionEnFrames} from '../../template/reel/src/Reel.jsx';
import {api} from './api.js';
import {Textos, Tomas, Audio, Estilo, Exportar} from './Paneles.jsx';

const PANELES = [['textos', 'Textos'], ['tomas', 'Tomas'], ['audio', 'Audio'], ['estilo', 'Estilo'], ['exportar', 'Exportar']];
export const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export function App() {
  const [lista, setLista] = useState([]);
  const [id, setId] = useState(() => new URLSearchParams(location.search).get('p') || '');
  const [p, setP] = useState(null);          // lo que dice el disco
  const [data, setData] = useState(null);    // lo que se ve (con los retoques sin aplicar)
  const [opciones, setOpciones] = useState(null);
  const [panel, setPanel] = useState('textos');
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState(null);  // {tipo: 'ok'|'error', texto}
  const [frame, setFrame] = useState(0);
  const [mover, setMover] = useState(null);  // índice de palabra a reubicar con un clic en la vista previa
  const player = useRef(null);

  useEffect(() => { api.proyectos().then(setLista).catch((e) => setAviso({tipo: 'error', texto: e.message})); api.opciones().then(setOpciones); }, []);
  useEffect(() => {
    if (!id) return;
    history.replaceState(null, '', `?p=${id}`);
    api.proyecto(id).then((x) => { setP(x); setData(x.data); setAviso(null); }).catch((e) => setAviso({tipo: 'error', texto: e.message}));
  }, [id]);
  useEffect(() => {
    const pl = player.current; if (!pl) return;
    const f = (e) => setFrame(e.detail.frame);
    pl.addEventListener('frameupdate', f);
    return () => pl.removeEventListener('frameupdate', f);
  }, [data !== null]);

  // guarda en disco con un script del repo y deja la vista previa igual a lo que quedó
  const aplicar = async (que, fn) => {
    setOcupado(que); setAviso(null);
    try {
      const x = await fn();
      setP(x); setData(x.data);
      const zona = (x.log || '').split('\n').filter((l) => /FUERA DE ZONA|CONTRASTE/.test(l));
      setAviso(zona.length ? {tipo: 'error', texto: zona.join('\n')} : {tipo: 'ok', texto: `${que}: listo`});
    } catch (e) { setAviso({tipo: 'error', texto: e.message}); }
    setOcupado('');
  };
  const irA = (seg) => player.current?.seekTo(Math.round(seg * FPS));
  const t = frame / FPS;

  const props = useMemo(() => data && p && ({data, brand: p.brand, base: `/media/${p.id}/`}), [data, p]);

  const clicVista = (e) => {
    if (mover === null) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left) / r.width * 1080), y = Math.round((e.clientY - r.top) / r.height * 1920);
    setData((d) => ({...d, words: d.words.map((w, i) => (i === mover ? {...w, x, y, _editada: [...new Set([...(w._editada || []), 'x', 'y'])]} : w))}));
    setMover(null);
  };

  return (
    <div className="app">
      <header>
        <b className="logo">Editor IA</b>
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Elegí un proyecto…</option>
          {lista.map((x) => <option key={x.id} value={x.id}>{x.id}</option>)}
        </select>
        {p && <span className="sub">{p.brand.nombre} · {p.data.clips.length} tomas · {p.data.duration.toFixed(1)} s</span>}
        <span className="espacio" />
        {ocupado && <span className="ocupado">{ocupado}…</span>}
      </header>
      {!p || !props ? <main className="vacio">{lista.length ? 'Elegí un proyecto arriba.' : 'No hay proyectos de la plantilla en proyectos/ (se crean con scripts/nuevo_proyecto.sh).'}</main> : (
        <main>
          <section className="vista">
            <div className={'marco' + (mover !== null ? ' moviendo' : '')}>
              <Player ref={player} component={Reel} inputProps={props} durationInFrames={duracionEnFrames(data)} fps={FPS}
                compositionWidth={1080} compositionHeight={1920} controls clickToPlay={mover === null}
                style={{width: '100%', height: '100%'}} acknowledgeRemotionLicense />
              {mover !== null && <div className="capa" onClick={clicVista}>Hacé clic donde va «{data.words[mover]?.text}»</div>}
            </div>
            <div className="tiempo">{fmt(t)} <span>/ {fmt(data.duration)}</span></div>
          </section>
          <section className="panel">
            <nav>{PANELES.map(([k, n]) => <button key={k} className={panel === k ? 'activo' : ''} onClick={() => setPanel(k)}>{n}</button>)}</nav>
            {aviso && <pre className={'aviso ' + aviso.tipo} onClick={() => setAviso(null)}>{aviso.texto}</pre>}
            <div className="contenido">
              {panel === 'textos' && <Textos p={p} data={data} setData={setData} t={t} irA={irA} mover={mover} setMover={setMover}
                aplicar={(guion) => aplicar('Textos', () => api.guardarGuion(p.id, guion))} ocupado={!!ocupado} />}
              {panel === 'tomas' && <Tomas p={p} irA={irA} aplicar={(edl) => aplicar('Tomas', () => api.guardarEdl(p.id, edl))}
                subir={(f) => aplicar('Subir toma', () => api.subir(p.id, 'toma', f))} ocupado={!!ocupado} />}
              {panel === 'audio' && <Audio p={p} data={data} setData={setData} opciones={opciones}
                aplicar={(c) => aplicar('Audio', () => api.guardarProyecto(p.id, c))}
                subir={(f) => aplicar('Subir música', () => api.subir(p.id, 'musica', f))} ocupado={!!ocupado} />}
              {panel === 'estilo' && opciones && <Estilo p={p} data={data} setData={setData} opciones={opciones}
                aplicar={(estilo) => aplicar('Estilo', () => api.guardarProyecto(p.id, {estilo}))} ocupado={!!ocupado} />}
              {panel === 'exportar' && <Exportar p={p} recargar={() => api.proyecto(p.id).then(setP)} />}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
