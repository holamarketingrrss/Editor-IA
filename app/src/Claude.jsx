import React, {useEffect, useRef, useState} from 'react';
import {api, claudeApi} from './api.js';
import {Icono} from './ui.jsx';

const PLANTILLA = `Elegí una plantilla arriba o pegá el pedido (también sirve el brief completo).`;
const MODELOS = [['sonnet', 'Sonnet · recomendado'], ['opus', 'Opus · más capaz, gasta más'],
  ['haiku', 'Haiku · cambios chicos'], ['cuenta', 'El de la cuenta']];
const leerModelo = () => { try { return localStorage.getItem('editor.modelo') || 'sonnet'; } catch { return 'sonnet'; } };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Pedido (sin proyecto: brief → reel nuevo) o Cambios (sobre el proyecto abierto, en la misma sesión de Claude)
// soporte: 'pregunta' | 'ajuste' (pantalla Soporte); si no, pedido (sin proyecto) o cambios (con proyecto)
export function Claude({p, t, recargar, alTerminar, soporte}) {
  const modo = soporte || (p ? 'cambios' : 'pedido');
  const esSoporte = !!soporte;
  // plantillas y botones de cambios: app/plantillas.json, editable en Ajustes
  const [pl, setPl] = useState({plantillas: [], cambios: []});
  useEffect(() => { if (!esSoporte) fetch('/api/ajustes/plantillas').then((r) => r.json()).then((x) => setPl(JSON.parse(x.texto))).catch(() => {}); }, []);
  const PLANTILLAS = pl.plantillas, CAMBIOS = pl.cambios;
  const [estado, setEstado] = useState(null);
  const [texto, setTexto] = useState('');
  const [eventos, setEventos] = useState([]);
  const [corriendo, setCorriendo] = useState(false);
  const [error, setError] = useState('');
  const [presets, setPresets] = useState([]);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState(leerModelo);
  const elegirModelo = (m) => { setModelo(m); try { localStorage.setItem('editor.modelo', m); } catch { /* sin storage */ } };
  const fuente = useRef(null), caja = useRef(null), area = useRef(null), ultimoRefresco = useRef(0);

  const conectar = () => {
    fuente.current?.close();
    setEventos([]); setCorriendo(true);
    const es = claudeApi.eventos(); fuente.current = es;
    es.onmessage = (m) => {
      const ev = JSON.parse(m.data);
      if (ev.tipo === 'nada') { setCorriendo(false); es.close(); return; }
      if (ev.tipo === 'refrescar') {   // la vista previa se pone al día mientras Claude trabaja
        if (Date.now() - ultimoRefresco.current > 1500) { ultimoRefresco.current = Date.now(); recargar?.(); }
        return;
      }
      setEventos((l) => [...l, ev]);
      if (ev.tipo === 'fin') { setCorriendo(false); es.close(); alTerminar?.(ev.proyecto); }
    };
    es.onerror = () => { es.close(); setCorriendo(false); };
  };
  useEffect(() => {
    claudeApi.estado().then((e) => { setEstado(e); if (e.corriendo) conectar(); }).catch((e) => setError(e.message));
    if (!p) api.presets().then(setPresets).catch(() => {});
    return () => fuente.current?.close();
  }, []);
  useEffect(() => { caja.current && (caja.current.scrollTop = caja.current.scrollHeight); }, [eventos]);

  const enviar = async () => {
    setError('');
    try { await claudeApi.iniciar(modo, p?.id, texto, marca || undefined, modelo); setTexto(''); conectar(); } catch (e) { setError(e.message); }
  };
  // selecciona el próximo campo [entre corchetes] desde la posición dada (Tab lo recorre)
  const proximoCampo = (txt, desde = 0) => {
    const a = area.current; if (!a) return false;
    const re = /\[[^\]\n]+\]/g; re.lastIndex = desde;
    const m = re.exec(txt) || (desde > 0 ? (re.lastIndex = 0, re.exec(txt)) : null);
    if (!m) return false;
    setTimeout(() => { a.focus(); a.setSelectionRange(m.index, m.index + m[0].length); });
    return true;
  };
  const [plantilla, setPlantilla] = useState('');
  const usarPlantilla = (pl) => {
    if (texto.trim() && texto !== PLANTILLAS.find((x) => x.id === plantilla)?.texto && !confirm('¿Reemplazar lo que escribiste por la plantilla?')) return;
    setPlantilla(pl.id); setTexto(pl.texto); proximoCampo(pl.texto);
  };
  const insertarCambio = ({texto: frase}) => {
    const a = area.current, linea = `${mmss(t)} — ${frase}`;
    const pos = a?.selectionEnd ?? texto.length;
    const antes = texto.slice(0, pos), sep = antes && !antes.endsWith('\n') ? '\n' : '';
    const nuevo = antes + sep + linea + texto.slice(pos);
    setTexto(nuevo); proximoCampo(nuevo, (antes + sep).length);
  };
  const enviarRevisando = () => {
    const pendientes = texto.match(/\[[^\]\n]+\]/g);
    if (pendientes && !confirm(`Quedaron campos sin completar: ${pendientes.slice(0, 4).join(', ')}${pendientes.length > 4 ? '…' : ''}.\n¿Mandar igual?`)) return;
    enviar();
  };
  const insertarTiempo = () => {
    const a = area.current, marca = `${mmss(t)} — `;
    const pos = a?.selectionStart ?? texto.length;
    const antes = texto.slice(0, pos), sep = antes && !antes.endsWith('\n') ? '\n' : '';
    setTexto(antes + sep + marca + texto.slice(pos));
    setTimeout(() => { a?.focus(); const c = (antes + sep + marca).length; a?.setSelectionRange(c, c); });
  };

  if (estado && !estado.disponible) {
    return (
      <div className="aviso error">
        Claude Code no está instalado en esta compu (o no está en el PATH). Instalalo, abrilo una vez en esta carpeta con
        <code>claude</code> y logueate con la cuenta de la agencia (<code>/login</code>). Después recargá la app.
      </div>
    );
  }
  return (
    <div className={'claude ' + modo}>
      {!esSoporte && (modo === 'pedido'
        ? <p className="nota">Elegí la marca y una plantilla, y completá lo que está entre corchetes (también podés pegar el brief completo).
            Claude lee la ficha de Notion y el preset de la marca, baja el material, arma el corte, los subtítulos y el cierre. Lo vas a ver en la vista previa.</p>
        : <p className="nota">Un cambio por línea, con el segundo del reel. Pausá donde querés el cambio y tocá <b>Insertar tiempo</b>.
            Claude sigue la misma sesión del pedido y reusa lo que ya armó.</p>)}
      {modo === 'pedido' && presets.length > 0 && (
        <div className="marcas" role="radiogroup" aria-label="Marca">
          <button role="radio" aria-checked={!marca} className={'marca-op' + (!marca ? ' activo' : '')} onClick={() => setMarca('')} disabled={corriendo}>
            <span className="logo-marca auto"><Icono n="chispa" /></span><b>Según el pedido</b></button>
          {presets.map((x) => (
            <button key={x.id} role="radio" aria-checked={marca === x.id} className={'marca-op' + (marca === x.id ? ' activo' : '')}
              style={{'--marca': x.color}} onClick={() => setMarca(x.id)} disabled={corriendo} title={`${x.marca} · ${x.handle || ''}`}>
              <span className="logo-marca"><img src={x.logo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></span>
              <b>{x.marca}</b>
            </button>
          ))}
        </div>
      )}
      {!esSoporte && <div className="plantillas" role="group" aria-label={modo === 'pedido' ? 'Plantillas de pedido' : 'Cambios frecuentes'}>
        <span className="sub">{modo === 'pedido' ? 'Plantilla:' : 'Agregar:'}</span>
        {modo === 'pedido'
          ? PLANTILLAS.map((pl) => <button key={pl.id} className={'chip' + (plantilla === pl.id ? ' activo' : '')} title={pl.ayuda} disabled={corriendo}
              onClick={() => usarPlantilla(pl)}>{pl.nombre}</button>)
          : CAMBIOS.map((c) => <button key={c.nombre} className="chip" disabled={corriendo} onClick={() => insertarCambio(c)} title={`${mmss(t)} — ${c.texto}`}>{c.nombre}</button>)}
      </div>}
      {modo === 'pedido' && plantilla && <p className="sub ayuda-plantilla">{PLANTILLAS.find((x) => x.id === plantilla)?.ayuda}. Completá lo que está entre corchetes
        (<kbd>Tab</kbd> pasa al siguiente) y borrá las líneas que no apliquen: el resto lo toma de la ficha y del preset de la marca.</p>}
      <textarea ref={area} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={corriendo}
        placeholder={modo === 'pedido' ? PLANTILLA : modo === 'pregunta' ? '¿Cómo cambio el logo de una marca? ¿Por qué el reel salió sin música?'
          : modo === 'ajuste' ? 'Agregá el color violeta #7B2CBF a TECNO como acento\nSumá una plantilla para stories de 10 s'
          : '0:04 — "argentina" se lee poco: pasala a blanco\n0:06–0:07 — cambiá la toma por una de clientes comiendo'}
        rows={modo === 'pedido' ? 10 : 5}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && texto.trim() && !corriendo) enviarRevisando();
          if (e.key === 'Tab' && !e.shiftKey && /\[[^\]\n]+\]/.test(texto) && proximoCampo(texto, e.currentTarget.selectionEnd)) e.preventDefault();
        }} />
      <div className="acciones">
        <button className="primario" disabled={!texto.trim() || corriendo || !estado} onClick={enviarRevisando}>
          <Icono n="chispa" />{{pedido: 'Editar con Claude', cambios: 'Pedir cambios', pregunta: 'Preguntar', ajuste: 'Pedir el cambio'}[modo]}<kbd>⌘↵</kbd></button>
        {modo === 'cambios' && <button disabled={corriendo} onClick={insertarTiempo}><Icono n="reloj" />Insertar {mmss(t)}</button>}
        {corriendo && <button onClick={() => claudeApi.parar()}>Parar</button>}
        <label className="modelo"><span>Modelo</span><select value={modelo} onChange={(e) => elegirModelo(e.target.value)} disabled={corriendo}>
          {MODELOS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        
      </div>
      {error && <div className="aviso error">{error}</div>}
      {eventos.length > 0 && (
        <div className="registro" ref={caja}>
          {eventos.map((ev, i) => <Evento key={i} ev={ev} />)}
          {corriendo && <div className="ev pensando"><span className="pulso" />Claude está trabajando…</div>}
        </div>
      )}
    </div>
  );
}

// markdown mínimo de las respuestas de Claude: **negrita** y `código`
const md = (t) => t.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((x, i) => (x.startsWith('**') ? <b key={i}>{x.slice(2, -2)}</b>
  : x.startsWith('`') ? <code key={i}>{x.slice(1, -1)}</code> : x));

function Evento({ev}) {
  if (ev.tipo === 'inicio') return <div className="ev sub">{{pedido: 'Pedido nuevo', pregunta: 'Consulta a soporte', ajuste: 'Pedido de cambio a soporte'}[ev.modo] ?? `Cambios en ${ev.p}`}{ev.continua ? ' · sigue la sesión anterior' : ''}</div>;
  if (ev.tipo === 'conectores') {
    const srv = ev.servidores ?? ev.lista.map((nombre) => ({nombre, estado: 'connected'}));
    const ESTADO = {connected: 'ok', pending: 'conectando…', 'needs-auth': 'falta autorizar', failed: 'falló'};
    if (ev.apiKey) {
      return <div className="ev alerta">Claude Code está usando una clave de API ({ev.apiKey}) en lugar del login de claude.ai: con clave de API no cargan
        Notion, Drive ni ElevenLabs. Sacá la variable ANTHROPIC_API_KEY de la terminal de esta compu (o pasá el motor a "api" en Equipo si es a propósito).</div>;
    }
    if (!srv.length) {
      return <div className="ev alerta">Claude Code no informó conectores de claude.ai. Puede ser que sigan cargando (si el pedido usa Notion o Drive
        sin problema, ignorá este aviso), o que la compu no tenga el login de la cuenta de la agencia. Para revisar: en una terminal, <code>claude</code>
        → <code>/status</code> (qué cuenta está logueada) y <code>/mcp</code> (estado de cada conector).</div>;
    }
    const mal = srv.filter((x) => x.estado === 'needs-auth' || x.estado === 'failed');
    return (
      <div className={'ev ' + (mal.length ? 'alerta' : 'sub')}>
        Conectores: {srv.map((x, i) => <span key={x.nombre}>{i ? ', ' : ''}{x.nombre}{x.estado !== 'connected' ? ` (${ESTADO[x.estado] ?? x.estado})` : ''}</span>)}
        {mal.length > 0 && <> — para {mal.map((x) => x.nombre).join(', ')}: claude.ai › Configuración › Conectores, o <code>claude</code> → <code>/mcp</code> en esta compu.</>}
      </div>
    );
  }
  if (ev.tipo === 'paso') return <div className="ev paso"><b>{ev.herramienta}</b> {ev.detalle}</div>;
  if (ev.tipo === 'texto') return <div className="ev texto">{md(ev.texto)}</div>;
  if (ev.tipo === 'fin') {
    return (
      <div className={'ev fin ' + (ev.ok ? 'ok' : 'error')}>
        {ev.ok ? 'Listo' : 'Terminó con error'}{ev.segundos ? ` · ${ev.segundos} s` : ''}{ev.costo != null ? ` · US$ ${ev.costo.toFixed(2)}${ev.continua ? ' acumulado del proyecto' : ''}` : ''}{ev.modelos?.length ? ` · ${ev.modelos.map((x) => x.replace(/^claude-/, '')).join(', ')}` : ''}
        {ev.conectoresUsados?.length > 0 && <div className="sub">Usó: {ev.conectoresUsados.join(', ')}</div>}
        {ev.error && <pre>{ev.error}</pre>}
        {ev.denegados?.length > 0 && <div>Acciones que necesitaban permiso y no se hicieron: <ul>{ev.denegados.map((d, i) => <li key={i}><code>{d}</code></li>)}</ul></div>}
      </div>
    );
  }
  return null;
}
