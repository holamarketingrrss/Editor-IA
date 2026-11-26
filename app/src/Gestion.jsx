// Pantallas para que el equipo cambie todo sin tocar código: Marcas, Ajustes (plantillas, instrucciones, guía),
// Guía y Soporte (preguntar o pedir un cambio a Claude).
import React, {useEffect, useMemo, useState} from 'react';
import {api, gestionApi} from './api.js';
import {Icono, useAviso} from './ui.jsx';
import {Claude} from './Claude.jsx';

// ---------- markdown mínimo (guía): títulos, listas, tablas, **negrita**, `código`
const enLinea = (t) => t.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((x, i) => (x.startsWith('**') ? <b key={i}>{x.slice(2, -2)}</b>
  : x.startsWith('`') ? <code key={i}>{x.slice(1, -1)}</code> : x.startsWith('*') && x.length > 2 ? <i key={i}>{x.slice(1, -1)}</i> : x));
export function Markdown({texto}) {
  const bloques = []; let lista = null, tabla = null;
  const cerrar = () => { if (lista) bloques.push(lista); if (tabla) bloques.push(tabla); lista = null; tabla = null; };
  for (const linea of String(texto).split('\n')) {
    const l = linea.trimEnd();
    const h = /^(#{1,3}) (.*)/.exec(l), li = /^(\s*)([-*]|\d+\.) (.*)/.exec(l);
    if (h) { cerrar(); const H = `h${h[1].length + 1}`; bloques.push(<H key={bloques.length}>{enLinea(h[2])}</H>); continue; }
    if (/^\|/.test(l)) {
      if (lista) cerrar();
      if (/^\|[\s|:-]+\|$/.test(l)) continue;
      const celdas = l.split('|').slice(1, -1).map((c) => c.trim());
      if (!tabla) tabla = {tipo: 'tabla', filas: []};
      tabla.filas.push(celdas); continue;
    }
    if (li) {
      if (tabla) cerrar();
      if (!lista) lista = {tipo: /\d/.test(li[2]) ? 'ol' : 'ul', items: []};
      if (li[1].length >= 2 && lista.items.length) lista.items[lista.items.length - 1].sub.push(li[3]);
      else lista.items.push({t: li[3], sub: []});
      continue;
    }
    cerrar();
    if (l.trim() && !/^```/.test(l)) bloques.push(<p key={bloques.length}>{enLinea(l)}</p>);
  }
  cerrar();
  return <div className="md">{bloques.map((b, i) => {
    if (React.isValidElement(b)) return b;
    if (b.tipo === 'tabla') return <table key={i} className="tabla md-tabla"><thead><tr>{b.filas[0].map((c, j) => <th key={j}>{enLinea(c)}</th>)}</tr></thead>
      <tbody>{b.filas.slice(1).map((f, k) => <tr key={k}>{f.map((c, j) => <td key={j}>{enLinea(c)}</td>)}</tr>)}</tbody></table>;
    const L = b.tipo;
    return <L key={i}>{b.items.map((it, k) => <li key={k}>{enLinea(it.t)}{it.sub.length > 0 && <ul>{it.sub.map((s, j) => <li key={j}>{enLinea(s)}</li>)}</ul>}</li>)}</L>;
  })}</div>;
}

export function Guia({abrirSoporte}) {
  const [g, setG] = useState(null);
  useEffect(() => { fetch('/api/guia').then((r) => r.json()).then(setG).catch(() => setG({texto: 'No se pudo leer la guía.'})); }, []);
  return (
    <main className="pagina guia">
      <div className="encabezado"><h2><small>?</small>Guía</h2>
        <button onClick={abrirSoporte}><Icono n="chispa" />¿No está acá? Preguntale a Soporte</button></div>
      {g ? <Markdown texto={g.texto.replace(/^# .*\n/, '')} /> : <p className="nota">Cargando…</p>}
    </main>
  );
}

// ---------- Soporte: preguntar (Claude solo lee) o pedir un cambio (Claude edita la configuración)
export function Soporte() {
  const [modo, setModo] = useState('pregunta');
  return (
    <main className="pagina soporte">
      <div className="encabezado"><h2><small>!</small>Soporte</h2></div>
      <div className="segmentos" role="tablist">
        <button role="tab" aria-selected={modo === 'pregunta'} className={modo === 'pregunta' ? 'activo' : ''} onClick={() => setModo('pregunta')}>Preguntar</button>
        <button role="tab" aria-selected={modo === 'ajuste'} className={modo === 'ajuste' ? 'activo' : ''} onClick={() => setModo('ajuste')}>Pedir un cambio</button>
      </div>
      <p className="nota">{modo === 'pregunta'
        ? 'Preguntá cómo se hace algo o por qué salió así. Claude mira la guía y la configuración y responde, sin cambiar nada.'
        : 'Pedí un cambio del editor: una marca, una plantilla, cómo trabaja Claude, la guía… Claude lo hace y te dice qué tocó. Queda en esta compu.'}</p>
      <Claude key={modo} p={null} t={0} soporte={modo} />
    </main>
  );
}

// ---------- Marcas
const TEXTO_A_LISTA = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
const CASILLEROS = [['G', 'Títulos y destacados'], ['B', 'Texto'], ['S', 'Mayúsculas y @ del cierre'], ['K', 'Opcional (script o itálica)']];

function FuenteMuestra({base, f}) {
  const fam = useMemo(() => `muestra-${Math.random().toString(36).slice(2)}`, [f?.archivo]);
  useEffect(() => {
    if (!f?.archivo) return;
    const ff = new FontFace(fam, `url(${base}fonts/${f.archivo})`); ff.load().then((x) => document.fonts.add(x)).catch(() => {});
  }, [fam, base, f?.archivo]);
  return <span className="muestra-fuente" style={{fontFamily: `'${fam}', sans-serif`, textTransform: f?.mayusculas ? 'uppercase' : 'none', letterSpacing: f?.espaciado ?? 0}}>Elegí tu marca 18</span>;
}

export function Marcas() {
  const avisar = useAviso();
  const [lista, setLista] = useState([]);
  const [id, setId] = useState('');
  const [m, setM] = useState(null);         // lo guardado
  const [b, setB] = useState(null);         // brand en edición
  const [pr, setPr] = useState(null);       // preset en edición
  const listar = () => api.presets().then(setLista).catch((e) => avisar('error', 'No se pudieron leer las marcas', e.message));
  useEffect(() => { listar(); }, []);
  const cargar = (x) => { setM(x); setB(JSON.parse(JSON.stringify(x.brand))); setPr(JSON.parse(JSON.stringify(x.preset))); };
  useEffect(() => { if (id) gestionApi.marca(id).then(cargar).catch((e) => avisar('error', 'No se pudo abrir la marca', e.message)); else setM(null); }, [id]);
  const sucia = m && (JSON.stringify(b) !== JSON.stringify(m.brand) || JSON.stringify(pr) !== JSON.stringify(m.preset));

  const nueva = async () => {
    const nombre = prompt('Nombre de la marca nueva:'); if (!nombre) return;
    try { const x = await gestionApi.nuevaMarca(nombre); await listar(); setId(x.id); avisar('ok', `Marca ${x.brand.nombre} creada`, 'Completá colores, fuentes y logo.'); }
    catch (e) { avisar('error', 'No se pudo crear', e.message); }
  };
  const guardar = async () => {
    try { cargar(await gestionApi.guardarMarca(id, {brand: b, preset: pr})); listar(); avisar('ok', 'Marca guardada'); }
    catch (e) { avisar('error', 'No se pudo guardar', e.message); }
  };
  const subir = async (tipo, archivo, casillero) => {
    try {
      const x = await gestionApi.subirMarca(id, tipo, archivo);
      setM(x); setB((bb) => {
        const n = {...bb, ...(tipo === 'logo' ? {logo: x.subido} : {}), ...(tipo === 'isotipo' ? {outro: {...(bb.outro || {}), isotipo: x.subido}} : {})};
        if (tipo === 'fuente' && casillero) {
          const f = n.fuentes[casillero] || {};
          n.fuentes = {...n.fuentes, [casillero]: {...f, archivo: x.subido, familia: f.familia || x.subido.replace(/\.\w+$/, ''), ancho: f.mayusculas ? x.ancho?.may : x.ancho?.min}};
        }
        return n;
      });
      avisar('ok', `${archivo.name} subido`, tipo === 'fuente' ? 'Guardá para aplicarlo.' : '');
    } catch (e) { avisar('error', 'No se pudo subir', e.message); }
  };
  const borrarMarca = async () => {
    if (!confirm(`¿Mandar ${b.nombre} a la papelera? Los proyectos hechos con ella siguen andando; se recupera desde Proyectos › Papelera.`)) return;
    try { await gestionApi.borrarMarca(id); setId(''); listar(); avisar('ok', 'Marca en la papelera'); } catch (e) { avisar('error', 'No se pudo', e.message); }
  };

  if (!id) {
    return (
      <main className="pagina pagina-marcas">
        <div className="encabezado"><h2><small>M</small>Marcas</h2><button className="primario" onClick={nueva}><Icono n="mas" />Nueva marca</button></div>
        <p className="nota">Colores, fuentes, logo, voz, notas del design system y estrategia de cada marca. Lo que cambies acá vale para sus videos.</p>
        <div className="galeria-marcas">
          {lista.map((x) => (
            <button key={x.id} className="marca-op grande" style={{'--marca': x.color}} onClick={() => setId(x.id)}>
              <span className="logo-marca"><img src={x.logo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></span>
              <b>{x.marca}</b><span className="dato">{x.handle} · voz {x.voz || '—'}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }
  if (!m || !b) return <main className="cargando"><span className="pulso" />Abriendo la marca…</main>;
  const colores = Object.keys(b.colores);
  const ponerColor = (k, v) => setB({...b, colores: {...b.colores, [k]: v}});
  const renombrarColor = (k, nuevo) => {
    nuevo = nuevo.toLowerCase().replace(/[^a-z0-9]/g, ''); if (!nuevo || b.colores[nuevo]) return;
    const c = Object.fromEntries(Object.entries(b.colores).map(([kk, v]) => [kk === k ? nuevo : kk, v]));
    setB({...b, colores: c, acentos: (b.acentos || []).map((a) => (a === k ? nuevo : a)), outro: {...b.outro, fondo: b.outro?.fondo === k ? nuevo : b.outro?.fondo}});
  };
  const fuente = (k, campo, v) => setB({...b, fuentes: {...b.fuentes, [k]: {...(b.fuentes[k] || {respaldo: 'Arial, sans-serif', peso: 700, interlineado: 1, espaciado: 0, ancho: 0.55}), [campo]: v}}});
  const lineas = (v) => (Array.isArray(v) ? v.join('\n') : v || '');
  return (
    <main className="pagina pagina-marcas editor-marca">
      <div className="encabezado">
        <button className="volver" onClick={() => (sucia && !confirm('Hay cambios sin guardar. ¿Salir igual?') ? null : setId(''))}><Icono n="atras" />Marcas</button>
        <h2 className="titulo-marca">{b.nombre}</h2>
      </div>

      <fieldset><legend>Datos</legend><div className="form dos">
        <label>Nombre<input value={b.nombre} onChange={(e) => setB({...b, nombre: e.target.value})} /></label>
        <label>@ usuario<input value={b.handle || ''} onChange={(e) => setB({...b, handle: e.target.value})} /></label>
        <label>Carpeta madre de Drive<input value={pr.driveMadre || ''} placeholder="link de Drive" onChange={(e) => setPr({...pr, driveMadre: e.target.value || null})} /></label>
        <label>Design system (link)<input value={pr.designSystem || ''} placeholder="https://claude.ai/artifact/…" onChange={(e) => setPr({...pr, designSystem: e.target.value || null})} /></label>
      </div></fieldset>

      <fieldset><legend>Colores</legend>
        <p className="sub">Nombre y color de cada uno. Los marcados como <b>acento</b> son los de las palabras destacadas. «texto» es el color de los subtítulos.</p>
        <div className="colores">
          {colores.map((k) => (
            <div key={k} className="color-fila">
              <input type="color" value={b.colores[k]} onChange={(e) => ponerColor(k, e.target.value.toUpperCase())} />
              <input className="corto" value={b.colores[k]} onChange={(e) => ponerColor(k, e.target.value)} />
              <input value={k} disabled={k === 'texto'} onChange={(e) => renombrarColor(k, e.target.value)} />
              <label className="check"><input type="checkbox" checked={(b.acentos || []).includes(k)}
                onChange={(e) => setB({...b, acentos: e.target.checked ? [...(b.acentos || []), k] : (b.acentos || []).filter((a) => a !== k)})} /> acento</label>
              {k !== 'texto' && <button className="icono" title="Quitar" onClick={() => { const c = {...b.colores}; delete c[k]; setB({...b, colores: c, acentos: (b.acentos || []).filter((a) => a !== k)}); }}><Icono n="x" /></button>}
            </div>
          ))}
          <button onClick={() => { let n = 1; while (b.colores[`color${n}`]) n++; ponerColor(`color${n}`, '#888888'); }}><Icono n="mas" />Agregar color</button>
        </div>
      </fieldset>

      <fieldset><legend>Fuentes</legend>
        <p className="sub">Subí el archivo (.woff2, .ttf u .otf) en el casillero; el ancho se mide solo.</p>
        {CASILLEROS.map(([k, uso]) => {
          const f = b.fuentes[k];
          if (!f && k !== 'K') return null;
          return (
            <div key={k} className="fuente-fila">
              <b className="casillero">{k}</b>
              <div className="fuente-datos">
                <span className="sub">{uso}</span>
                {f ? <>
                  <FuenteMuestra base={m.base} f={f} />
                  <div className="form dos">
                    <label>Familia<input value={f.familia || ''} onChange={(e) => fuente(k, 'familia', e.target.value)} /></label>
                    <label>Archivo<select value={f.archivo || ''} onChange={(e) => fuente(k, 'archivo', e.target.value)}>
                      <option value="">—</option>{m.archivos.fonts.map((x) => <option key={x}>{x}</option>)}</select></label>
                    <label>Peso<input type="number" step="100" value={f.peso ?? 400} onChange={(e) => fuente(k, 'peso', +e.target.value)} /></label>
                    <label className="check"><input type="checkbox" checked={!!f.mayusculas} onChange={(e) => fuente(k, 'mayusculas', e.target.checked)} /> En mayúsculas</label>
                  </div>
                </> : <button onClick={() => fuente(k, 'familia', b.fuentes.B?.familia || 'DM Sans')}><Icono n="mas" />Usar casillero K</button>}
              </div>
              {f && <label className="boton">Subir fuente<input type="file" accept=".woff2,.woff,.ttf,.otf" hidden onChange={(e) => e.target.files[0] && subir('fuente', e.target.files[0], k)} /></label>}
            </div>
          );
        })}
      </fieldset>

      <fieldset><legend>Logo y cierre</legend><div className="logos">
        {[['logo', 'Logo', b.logo], ['isotipo', 'Isotipo (cierre con anillo)', b.outro?.isotipo]].map(([tipo, nombre, arch]) => (
          <div key={tipo} className="logo-caja" style={{'--fondo': b.colores[b.outro?.fondo] || '#222'}}>
            {arch ? <img src={`${m.base}brand/${arch}`} alt="" /> : <span className="sub">Sin {nombre.toLowerCase()}</span>}
            <span className="sub">{nombre}</span>
            <label className="boton">Subir<input type="file" accept=".png,.svg,.webp" hidden onChange={(e) => e.target.files[0] && subir(tipo, e.target.files[0])} /></label>
          </div>
        ))}
        <div className="form">
          <label>Fondo del cierre<select value={b.outro?.fondo || ''} onChange={(e) => setB({...b, outro: {...b.outro, fondo: e.target.value}})}>{colores.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Color del @<select value={b.outro?.colorHandle || 'texto'} onChange={(e) => setB({...b, outro: {...b.outro, colorHandle: e.target.value}})}>{colores.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
      </div></fieldset>

      <fieldset><legend>Voz</legend><div className="form dos">
        <label className="check"><input type="checkbox" checked={pr.voz?.tipo === 'propia'} onChange={(e) => setPr({...pr, voz: e.target.checked ? {tipo: 'propia'} : {voice_id: 'YLtqUTaEXb7a9MAYuJu4', nombre: 'Julieta'}})} /> Voz propia (persona a cámara)</label>
        {pr.voz?.tipo !== 'propia' && <>
          <label>Nombre de la voz<input value={pr.voz?.nombre || ''} onChange={(e) => setPr({...pr, voz: {...pr.voz, nombre: e.target.value}})} /></label>
          <label>ID de ElevenLabs<input value={pr.voz?.voice_id || ''} onChange={(e) => setPr({...pr, voz: {...pr.voz, voice_id: e.target.value}})} /></label>
        </>}
      </div></fieldset>

      <fieldset><legend>Design system y estrategia (lo que lee Claude)</legend>
        <label className="largo">Notas del design system (una por renglón)
          <textarea rows={5} value={lineas(pr.notas)} onChange={(e) => setPr({...pr, notas: TEXTO_A_LISTA(e.target.value)})} /></label>
        <label className="largo">Estrategia: tono, pilares, público, límites (una idea por renglón)
          <textarea rows={6} value={lineas(pr.estrategia)} onChange={(e) => setPr({...pr, estrategia: TEXTO_A_LISTA(e.target.value)})} /></label>
        <p className="sub">Cuanto más corto y claro, menos gasta Claude en cada pedido. El estilo de edición por defecto se guarda desde un proyecto:
          Estilo › <i>Guardar como estilo de la marca</i>.</p>
      </fieldset>

      <div className="acciones">
        <button className="primario" disabled={!sucia} onClick={guardar}>Guardar marca</button>
        <button disabled={!sucia} onClick={() => cargar(m)}>Descartar</button>
        <span className="espacio" />
        <button className="peligro" onClick={borrarMarca}>Mandar a la papelera</button>
      </div>
    </main>
  );
}

// ---------- Ajustes: plantillas, instrucciones para Claude y guía
export function Ajustes() {
  const avisar = useAviso();
  const [lista, setLista] = useState([]);
  const [clave, setClave] = useState('plantillas');
  const [a, setA] = useState(null);
  const [texto, setTexto] = useState('');
  useEffect(() => { gestionApi.ajustes().then(setLista).catch(() => {}); }, []);
  useEffect(() => { setA(null); gestionApi.ajuste(clave).then((x) => { setA(x); setTexto(x.texto); }).catch((e) => avisar('error', 'No se pudo leer', e.message)); }, [clave]);
  const sucio = a && texto !== a.texto;
  const guardar = async (t = texto) => { try { const x = await gestionApi.guardarAjuste(clave, t); setA(x); setTexto(x.texto); avisar('ok', `${x.nombre}: guardado`, 'La versión anterior quedó guardada.'); } catch (e) { avisar('error', 'No se pudo guardar', e.message); } };
  const original = async () => {
    if (!confirm('¿Volver a la versión original del repositorio? Lo que cambiaron acá se reemplaza (la versión actual queda guardada).')) return;
    try { const x = await gestionApi.ajusteOriginal(clave); setA(x); setTexto(x.texto); avisar('ok', 'Volvió al original'); } catch (e) { avisar('error', 'No se pudo', e.message); }
  };
  return (
    <main className="pagina ajustes">
      <div className="encabezado"><h2><small>A</small>Ajustes</h2></div>
      <nav className="segmentos">{lista.map((x) => <button key={x.clave} className={clave === x.clave ? 'activo' : ''}
        onClick={() => (sucio && !confirm('Hay cambios sin guardar. ¿Cambiar igual?') ? null : setClave(x.clave))}>{x.nombre}</button>)}</nav>
      {!a ? <p className="nota">Cargando…</p> : clave === 'plantillas'
        ? <EditorPlantillas texto={texto} setTexto={setTexto} />
        : <>
          <p className="nota">{{instrucciones: 'Lo que Claude lee en cada pedido y cada cambio, además de CLAUDE.md. Cada línea suma gasto en todos los pedidos: corto y concreto.',
            soporte: 'Lo que Claude lee cuando alguien usa Soporte.', guia: 'La guía que ve el equipo (y que lee Soporte para responder). Formato: # títulos, - listas, **negrita**.'}[clave]}
            {' '}<span className="dato">{texto.length.toLocaleString('es-AR')} caracteres ≈ {Math.round(texto.length / 4).toLocaleString('es-AR')} tokens</span></p>
          <textarea className="editor-texto" value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck={false} />
        </>}
      <div className="acciones">
        <button className="primario" disabled={!sucio} onClick={() => guardar()}>Guardar</button>
        <button disabled={!sucio} onClick={() => setTexto(a.texto)}>Descartar</button>
        <span className="espacio" />
        <button onClick={original}>Volver al original</button>
      </div>
    </main>
  );
}

function EditorPlantillas({texto, setTexto}) {
  let d; try { d = JSON.parse(texto); } catch { d = null; }
  if (!d) return <p className="aviso error">El archivo de plantillas tiene un error. Usá «Volver al original».</p>;
  const poner = (n) => setTexto(JSON.stringify(n, null, 1) + '\n');
  const cambiar = (i, campo, v) => poner({...d, plantillas: d.plantillas.map((p, j) => (j === i ? {...p, [campo]: v} : p))});
  const mover = (i, k) => { const g = [...d.plantillas]; [g[i], g[i + k]] = [g[i + k], g[i]]; poner({...d, plantillas: g}); };
  return (
    <div className="plantillas-editor">
      <p className="nota">Cada plantilla: nombre del botón, una ayuda corta y el texto. Lo que va entre [corchetes] se completa al usarla. Pocas líneas: lo demás
        Claude lo toma de la ficha de Notion y de la marca.</p>
      {d.plantillas.map((p, i) => (
        <fieldset key={i}><legend>{p.nombre || 'Plantilla nueva'}</legend>
          <div className="form dos">
            <label>Nombre del botón<input value={p.nombre} onChange={(e) => cambiar(i, 'nombre', e.target.value)} /></label>
            <label>Ayuda<input value={p.ayuda || ''} onChange={(e) => cambiar(i, 'ayuda', e.target.value)} /></label>
          </div>
          <textarea rows={Math.max(4, p.texto.split('\n').length + 1)} value={p.texto} onChange={(e) => cambiar(i, 'texto', e.target.value)} spellCheck={false} />
          <div className="botones-fila">
            <button disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
            <button disabled={i === d.plantillas.length - 1} onClick={() => mover(i, 1)}>↓</button>
            <button className="peligro" onClick={() => confirm(`¿Quitar «${p.nombre}»?`) && poner({...d, plantillas: d.plantillas.filter((_, j) => j !== i)})}>Quitar</button>
          </div>
        </fieldset>
      ))}
      <button onClick={() => poner({...d, plantillas: [...d.plantillas, {id: `p${Date.now()}`, nombre: 'Nueva plantilla', ayuda: '', texto: 'Tipo: [tipo de video]\nFicha: [link de la ficha en Notion]'}]})}>
        <Icono n="mas" />Agregar plantilla</button>
      <fieldset><legend>Botones de «Cambios»</legend>
        {d.cambios.map((c, i) => (
          <div key={i} className="form dos cambio-fila">
            <label>Botón<input value={c.nombre} onChange={(e) => poner({...d, cambios: d.cambios.map((x, j) => (j === i ? {...x, nombre: e.target.value} : x))})} /></label>
            <label>Texto que inserta<input value={c.texto} onChange={(e) => poner({...d, cambios: d.cambios.map((x, j) => (j === i ? {...x, texto: e.target.value} : x))})} /></label>
            <button className="icono" title="Quitar" onClick={() => poner({...d, cambios: d.cambios.filter((_, j) => j !== i)})}><Icono n="x" /></button>
          </div>
        ))}
        <button onClick={() => poner({...d, cambios: [...d.cambios, {nombre: 'Nuevo', texto: '[qué cambiar]'}]})}><Icono n="mas" />Agregar botón</button>
      </fieldset>
    </div>
  );
}
