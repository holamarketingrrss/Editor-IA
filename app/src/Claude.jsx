import React, {useEffect, useRef, useState} from 'react';
import {claudeApi} from './api.js';

const PLANTILLA = `Editá el video de esta pieza: [link a la ficha en Notion].
Material: [link de Drive] (excluir […]). Formato 9:16, 15 s.`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Pedido (sin proyecto: brief → reel nuevo) o Cambios (sobre el proyecto abierto, en la misma sesión de Claude)
export function Claude({p, t, recargar, alTerminar}) {
  const modo = p ? 'cambios' : 'pedido';
  const [estado, setEstado] = useState(null);
  const [texto, setTexto] = useState('');
  const [eventos, setEventos] = useState([]);
  const [corriendo, setCorriendo] = useState(false);
  const [error, setError] = useState('');
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
    return () => fuente.current?.close();
  }, []);
  useEffect(() => { caja.current && (caja.current.scrollTop = caja.current.scrollHeight); }, [eventos]);

  const enviar = async () => {
    setError('');
    try { await claudeApi.iniciar(modo, p?.id, texto); setTexto(''); conectar(); } catch (e) { setError(e.message); }
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
      {modo === 'pedido'
        ? <p className="nota">Pegá el pedido (la plantilla del brief, completa o la versión corta). Claude lee la ficha de Notion y el design system,
            baja el material de Drive, genera la voz, arma el corte, los subtítulos y el cierre. Lo vas a ver en la vista previa.</p>
        : <p className="nota">Un cambio por línea, con el segundo del reel. Pausá donde querés el cambio y tocá <b>Insertar tiempo</b>.
            Claude sigue la misma sesión del pedido y reusa lo que ya armó.</p>}
      <textarea ref={area} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={corriendo}
        placeholder={modo === 'pedido' ? PLANTILLA : '0:04 — "argentina" se lee poco: pasala a blanco\n0:06–0:07 — cambiá la toma por una de clientes comiendo'}
        rows={modo === 'pedido' ? 10 : 5}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && texto.trim() && !corriendo) enviar(); }} />
      <div className="acciones">
        <button className="primario" disabled={!texto.trim() || corriendo || !estado} onClick={enviar}>
          {modo === 'pedido' ? 'Editar con Claude' : 'Pedir cambios'}</button>
        {modo === 'cambios' && <button disabled={corriendo} onClick={insertarTiempo}>Insertar tiempo ({mmss(t)})</button>}
        {corriendo && <button onClick={() => claudeApi.parar()}>Parar</button>}
        <span className="sub">{estado?.version ? `Claude Code ${estado.version.split(' ')[0]}` : ''}</span>
      </div>
      {error && <div className="aviso error">{error}</div>}
      {eventos.length > 0 && (
        <div className="registro" ref={caja}>
          {eventos.map((ev, i) => <Evento key={i} ev={ev} />)}
          {corriendo && <div className="ev pensando">Claude está trabajando…</div>}
        </div>
      )}
    </div>
  );
}

// markdown mínimo de las respuestas de Claude: **negrita** y `código`
const md = (t) => t.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((x, i) => (x.startsWith('**') ? <b key={i}>{x.slice(2, -2)}</b>
  : x.startsWith('`') ? <code key={i}>{x.slice(1, -1)}</code> : x));

function Evento({ev}) {
  if (ev.tipo === 'inicio') return <div className="ev sub">{ev.modo === 'pedido' ? 'Pedido nuevo' : `Cambios en ${ev.p}`}{ev.continua ? ' · sigue la sesión anterior' : ''}</div>;
  if (ev.tipo === 'conectores') {
    return ev.lista.length
      ? <div className="ev sub">Conectores: {ev.lista.join(', ')}</div>
      : <div className="ev alerta">Sin conectores de claude.ai en esta compu: Notion, Drive y ElevenLabs no van a estar disponibles. Revisá que Claude Code esté logueado con la cuenta de la agencia.</div>;
  }
  if (ev.tipo === 'paso') return <div className="ev paso"><b>{ev.herramienta}</b> {ev.detalle}</div>;
  if (ev.tipo === 'texto') return <div className="ev texto">{md(ev.texto)}</div>;
  if (ev.tipo === 'fin') {
    return (
      <div className={'ev fin ' + (ev.ok ? 'ok' : 'error')}>
        {ev.ok ? 'Listo' : 'Terminó con error'}{ev.segundos ? ` · ${ev.segundos} s` : ''}{ev.costo != null ? ` · US$ ${ev.costo.toFixed(2)}` : ''}
        {ev.error && <pre>{ev.error}</pre>}
        {ev.denegados?.length > 0 && <div>Acciones que necesitaban permiso y no se hicieron: <ul>{ev.denegados.map((d, i) => <li key={i}><code>{d}</code></li>)}</ul></div>}
      </div>
    );
  }
  return null;
}
