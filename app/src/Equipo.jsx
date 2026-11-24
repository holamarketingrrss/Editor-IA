// Acceso del equipo: pantalla de ingreso y administración (miembros, roles, límites, uso del mes y registro).
import React, {useEffect, useState} from 'react';
import {sesionApi, equipoApi} from './api.js';
import {Icono, useAviso} from './ui.jsx';

export function Login({entro}) {
  const [usuario, setUsuario] = useState(() => { try { return localStorage.getItem('editor.usuario') || ''; } catch { return ''; } });
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault(); setError(''); setEnviando(true);
    try {
      const r = await sesionApi.entrar(usuario, clave);
      try { localStorage.setItem('editor.usuario', usuario); } catch { /* sin storage */ }
      entro(r.usuario);
    } catch (x) { setError(x.message); setClave(''); }
    setEnviando(false);
  };
  return (
    <div className="app login">
      <form className="caja-login" onSubmit={enviar}>
        <span className="marca-app grande">editor<i>ia</i></span>
        <p className="nota">Hola Marketing · ingresá con tu usuario del equipo</p>
        <label>Usuario<input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus={!usuario} autoComplete="username" /></label>
        <label>Clave<input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus={!!usuario} autoComplete="current-password" /></label>
        {error && <div className="aviso error">{error}</div>}
        <button className="primario" disabled={!usuario || !clave || enviando}><Icono n="candado" />{enviando ? 'Entrando…' : 'Entrar'}</button>
        <p className="sub">¿Sin usuario o te olvidaste la clave? Pedíselo a un admin del editor.</p>
      </form>
    </div>
  );
}

const usd = (n) => `US$ ${(+n || 0).toFixed(2)}`;
const ACCIONES = {pedido: 'Pedido nuevo', cambios: 'Cambios con Claude', exportar: 'Exportó', textos: 'Editó textos', tomas: 'Editó tomas',
  proyecto: 'Editó estilo/audio', 'guardar-preset': 'Guardó estilo de marca', subir: 'Subió archivo', login: 'Entró', 'login-fallido': 'Clave incorrecta', equipo: 'Cambió el equipo'};

export function Equipo({yo, volver}) {
  const avisar = useAviso();
  const [d, setD] = useState(null);
  const [nuevo, setNuevo] = useState(null);   // formulario de alta
  const cargar = () => equipoApi.ver().then(setD).catch((e) => avisar('error', 'No se pudo leer el equipo', e.message));
  useEffect(() => { cargar(); }, []);
  const hacer = async (que, fn) => {
    try { await fn(); await cargar(); avisar('ok', que); return true; } catch (e) { avisar('error', `${que}: no se pudo`, e.message); return false; }
  };
  if (!d) return <main className="cargando"><span className="pulso" />Cargando el equipo…</main>;
  const total = Object.values(d.uso).reduce((a, u) => a + u.costo, 0);
  const pedidos = Object.values(d.uso).reduce((a, u) => a + u.pedidos, 0);
  return (
    <main className="equipo">
      <div className="encabezado">
        <h2><small>03</small>Equipo</h2>
        <button onClick={volver}><Icono n="atras" />Volver a proyectos</button>
      </div>
      <div className="resumen">
        <div><small>Personas activas</small><b>{d.miembros.filter((m) => m.activo).length}</b></div>
        <div><small>Reels pedidos este mes</small><b>{pedidos}</b></div>
        <div><small>{d.motor === 'api' ? 'Gasto de Claude este mes' : 'Uso de Claude este mes (equivalente)'}</small><b>{usd(total)}</b></div>
        <div className="motor"><small>Motor de Claude</small>
          <select value={d.motor} onChange={(e) => hacer('Motor cambiado', () => equipoApi.motor(e.target.value))}>
            <option value="cuenta">Cuenta de Claude de esta compu</option><option value="api">Clave de API de la agencia</option>
          </select>
        </div>
      </div>
      <p className="nota">{d.motor === 'api'
        ? 'Con clave de API, cada pedido se cobra por uso a la agencia y el límite mensual corta de verdad el gasto. Los conectores de claude.ai (Notion, Drive, ElevenLabs) no cargan con clave de API: ver app/EQUIPO.md.'
        : 'Con la cuenta de Claude, el costo es el equivalente en la API: no se cobra aparte, pero consume el límite del plan. El límite mensual por persona sirve para repartir ese plan.'}</p>

      {!d.miembros.length && <div className="aviso alerta">Ahora la app la usa una sola persona, sin login. Cuando agregues a la primera persona
        (queda como admin), la app empieza a pedir usuario y clave en todas las compus que la abran, y vas a tener que entrar con ese usuario.</div>}
      <section className="bloque-eq">
        <div className="encabezado"><h3>Personas</h3>{!nuevo && <button className="primario" onClick={() => setNuevo({nombre: '', id: '', email: '', rol: 'editor', clave: '', limiteUsd: ''})}><Icono n="mas" />Agregar</button>}</div>
        {nuevo && (
          <form className="alta" onSubmit={(e) => { e.preventDefault(); hacer(`${nuevo.nombre} agregado`, () => equipoApi.agregar({...nuevo, limiteUsd: nuevo.limiteUsd === '' ? null : +nuevo.limiteUsd})).then((ok) => ok && setNuevo(null)); }}>
            <label>Nombre<input required value={nuevo.nombre} onChange={(e) => setNuevo({...nuevo, nombre: e.target.value})} autoFocus /></label>
            <label>Usuario<input value={nuevo.id} placeholder={(nuevo.nombre.split(' ')[0] || '').toLowerCase()} onChange={(e) => setNuevo({...nuevo, id: e.target.value})} /></label>
            <label>Email<input type="email" value={nuevo.email} onChange={(e) => setNuevo({...nuevo, email: e.target.value})} /></label>
            <label>Rol<select value={nuevo.rol} onChange={(e) => setNuevo({...nuevo, rol: e.target.value})}><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
            <label>Clave inicial<input required minLength={6} type="password" value={nuevo.clave} onChange={(e) => setNuevo({...nuevo, clave: e.target.value})} autoComplete="new-password" /></label>
            <label>Límite / mes (US$)<input type="number" min="0" step="1" value={nuevo.limiteUsd} placeholder="sin límite" onChange={(e) => setNuevo({...nuevo, limiteUsd: e.target.value})} /></label>
            <div className="acciones-alta"><button className="primario">Agregar</button><button type="button" onClick={() => setNuevo(null)}>Cancelar</button></div>
          </form>
        )}
        <table className="tabla miembros">
          <thead><tr><th>Persona</th><th>Rol</th><th>Este mes</th><th>Uso de Claude</th><th>Límite / mes</th><th /></tr></thead>
          <tbody>
            {d.miembros.map((m) => {
              const u = d.uso[m.id] || {pedidos: 0, cambios: 0, exportaciones: 0, costo: 0};
              const pct = m.limiteUsd ? Math.min(100, (u.costo / m.limiteUsd) * 100) : 0;
              return (
                <tr key={m.id} className={m.activo ? '' : 'inactivo'}>
                  <td><b>{m.nombre}</b>{m.id === yo.id && <span className="yo">vos</span>}<div className="sub">{m.id}{m.email ? ` · ${m.email}` : ''}</div></td>
                  <td><select value={m.rol} onChange={(e) => hacer('Rol cambiado', () => equipoApi.cambiar(m.id, {rol: e.target.value}))}>
                    <option value="editor">Editor</option><option value="admin">Admin</option></select></td>
                  <td className="dato">{u.pedidos} pedidos · {u.cambios} cambios · {u.exportaciones} export.</td>
                  <td><div className="gasto"><span className="dato">{usd(u.costo)}</span>{m.limiteUsd != null && <div className={'barra-prog' + (pct >= 100 ? ' lleno' : '')}><i style={{width: `${pct}%`}} /></div>}</div></td>
                  <td><input type="number" min="0" step="1" className="corto" defaultValue={m.limiteUsd ?? ''} placeholder="—"
                    onBlur={(e) => { const v = e.target.value === '' ? null : +e.target.value; if (v !== m.limiteUsd) hacer('Límite cambiado', () => equipoApi.cambiar(m.id, {limiteUsd: v})); }} /></td>
                  <td><div className="botones-fila">
                    <button onClick={() => { const c = prompt(`Clave nueva para ${m.nombre} (6+ caracteres):`); if (c) hacer('Clave cambiada', () => equipoApi.cambiar(m.id, {clave: c})); }}>Clave</button>
                    <button onClick={() => hacer(m.activo ? `${m.nombre} desactivado` : `${m.nombre} activado`, () => equipoApi.cambiar(m.id, {activo: !m.activo}))}>{m.activo ? 'Desactivar' : 'Activar'}</button>
                    {m.id !== yo.id && <button className="peligro" onClick={() => confirm(`¿Quitar a ${m.nombre} del equipo? Su historial queda en el registro.`) && hacer(`${m.nombre} quitado`, () => equipoApi.quitar(m.id))}>Quitar</button>}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="bloque-eq">
        <h3>Registro · últimos 30 días</h3>
        {!d.registro.length && <p className="nota">Todavía no hay actividad.</p>}
        <ul className="registro-eq">
          {d.registro.map((r, i) => (
            <li key={i} className={r.accion === 'login-fallido' || r.ok === false ? 'mal' : ''}>
              <span className="dato">{new Date(r.fecha).toLocaleString('es-AR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'})}</span>
              <b>{d.miembros.find((m) => m.id === r.usuario)?.nombre || r.usuario || '—'}</b>
              <span>{ACCIONES[r.accion] || r.accion}{r.proyecto ? ` · ${r.proyecto}` : ''}{r.detalle ? ` · ${r.detalle}` : ''}</span>
              <span className="dato">{r.costo ? usd(r.costo) : ''}{r.segundos ? ` · ${Math.round(r.segundos / 60)} min` : ''}</span>
            </li>
          ))}
        </ul>
        <p className="sub">Configuración y registro completo: <code>{d.config}</code> (fuera del repo).</p>
      </section>
    </main>
  );
}
