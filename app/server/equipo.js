// Acceso del equipo: quién puede usar el editor, con qué rol, cuánto gasta cada uno y registro de lo que hace.
// Sin equipo.json la app funciona como siempre (una persona, en su compu, sin login). Con equipo.json pide clave.
// La configuración vive FUERA del repo (no se sube a git ni la sirve Vite): ~/.editor-ia/ o EDITOR_CONFIG.
//   equipo.json    {"motor": "cuenta"|"api", "miembros": [{id, nombre, email, rol: "admin"|"editor", activo, limiteUsd, clave}]}
//   registro.jsonl una línea por acción: {fecha, usuario, accion, proyecto, costo, modelo, segundos, ok}
// La clave se guarda con scrypt + sal (nunca en texto). Las sesiones duran 12 h y se pierden al reiniciar la app.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const CONFIG = process.env.EDITOR_CONFIG || path.join(os.homedir(), '.editor-ia');
const F_EQUIPO = path.join(CONFIG, 'equipo.json');
const F_REGISTRO = path.join(CONFIG, 'registro.jsonl');
const DURACION = 12 * 3600 * 1000;
const COOKIE = 'editor_sesion';
const ID_OK = /^[a-z0-9][a-z0-9._-]{1,30}$/;

const sesiones = new Map();   // token -> {usuario, vence}
const intentos = new Map();   // ip -> {n, hasta}: frena a quien prueba claves

export const leerEquipo = () => { try { return JSON.parse(fs.readFileSync(F_EQUIPO, 'utf8')); } catch { return null; } };
const guardarEquipo = (e) => {
  fs.mkdirSync(CONFIG, {recursive: true, mode: 0o700});
  fs.writeFileSync(F_EQUIPO, JSON.stringify(e, null, 1) + '\n', {mode: 0o600});
};
export const activo = () => !!leerEquipo()?.miembros?.length;

export const hashClave = (clave) => {
  const sal = crypto.randomBytes(16);
  return `scrypt$${sal.toString('hex')}$${crypto.scryptSync(clave, sal, 32).toString('hex')}`;
};
const claveOk = (clave, guardada) => {
  const [, sal, h] = String(guardada || '').split('$');
  if (!sal || !h || h.length !== 64) return false;
  const calc = crypto.scryptSync(String(clave), Buffer.from(sal, 'hex'), 32);
  return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
};
const FALSA = hashClave(crypto.randomBytes(12).toString('hex'));   // para usuarios que no existen
const publico = ({clave, ...m}) => m;

// ---------- miembros (lo usan la app y scripts/equipo.mjs)
export function agregar({id, nombre, email = '', rol = 'editor', clave, limiteUsd = null}) {
  const e = leerEquipo() || {motor: 'cuenta', miembros: []};
  id = String(id || nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!ID_OK.test(id)) throw new Error('usuario inválido (letras, números, punto o guion)');
  if (e.miembros.some((m) => m.id === id)) throw new Error(`ya existe ${id}`);
  if (!clave || String(clave).length < 6) throw new Error('la clave necesita al menos 6 caracteres');
  if (!['admin', 'editor'].includes(rol)) throw new Error('rol: admin o editor');
  // el primero siempre es admin: alguien tiene que poder administrar
  e.miembros.push({id, nombre: nombre || id, email, rol: e.miembros.length ? rol : 'admin', activo: true, limiteUsd, clave: hashClave(clave)});
  guardarEquipo(e);
  return publico(e.miembros.at(-1));
}

export function cambiar(id, cambios) {
  const e = leerEquipo(); const m = e?.miembros.find((x) => x.id === id);
  if (!m) throw new Error(`no existe ${id}`);
  if ('activo' in cambios) m.activo = !!cambios.activo;
  if ('rol' in cambios) { if (!['admin', 'editor'].includes(cambios.rol)) throw new Error('rol: admin o editor'); m.rol = cambios.rol; }
  if ('limiteUsd' in cambios) m.limiteUsd = cambios.limiteUsd === null || cambios.limiteUsd === '' ? null : Math.max(0, +cambios.limiteUsd);
  if ('nombre' in cambios && cambios.nombre) m.nombre = String(cambios.nombre).slice(0, 60);
  if ('email' in cambios) m.email = String(cambios.email || '').slice(0, 120);
  if (cambios.clave) { if (String(cambios.clave).length < 6) throw new Error('la clave necesita al menos 6 caracteres'); m.clave = hashClave(cambios.clave); }
  if (!e.miembros.some((x) => x.rol === 'admin' && x.activo)) throw new Error('tiene que quedar al menos un admin activo');
  guardarEquipo(e);
  if (m.activo === false || cambios.clave) for (const [t, s] of sesiones) if (s.usuario === id) sesiones.delete(t);   // lo saca ya
  return publico(m);
}

export function quitar(id) {
  const e = leerEquipo();
  const resto = (e?.miembros || []).filter((m) => m.id !== id);
  if (resto.length === e?.miembros.length) throw new Error(`no existe ${id}`);
  if (resto.length && !resto.some((x) => x.rol === 'admin' && x.activo)) throw new Error('tiene que quedar al menos un admin activo');
  e.miembros = resto; guardarEquipo(e);
  for (const [t, s] of sesiones) if (s.usuario === id) sesiones.delete(t);
}

export function motor(m) {
  const e = leerEquipo(); if (!e) throw new Error('primero agregá un miembro');
  if (!['cuenta', 'api'].includes(m)) throw new Error('motor: cuenta o api');
  e.motor = m; guardarEquipo(e);
}

// ---------- registro y gasto
export function registrar(ev) {
  try {
    fs.mkdirSync(CONFIG, {recursive: true, mode: 0o700});
    fs.appendFileSync(F_REGISTRO, JSON.stringify({fecha: new Date().toISOString(), ...ev}) + '\n', {mode: 0o600});
  } catch { /* el registro nunca frena el trabajo */ }
}
export const leerRegistro = (desde = 0) => {
  if (!fs.existsSync(F_REGISTRO)) return [];
  return fs.readFileSync(F_REGISTRO, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((x) => x && Date.parse(x.fecha) >= desde);
};
const inicioDeMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
// resumen del mes por persona: pedidos, cambios, exportaciones y costo de Claude (equivalente en la API si el motor es la cuenta)
export function usoDelMes() {
  const r = {};
  for (const x of leerRegistro(inicioDeMes())) {
    const u = (r[x.usuario || 'sin-usuario'] ??= {pedidos: 0, cambios: 0, exportaciones: 0, ediciones: 0, costo: 0});
    if (x.accion === 'pedido') u.pedidos++; else if (x.accion === 'cambios') u.cambios++;
    else if (x.accion === 'exportar') u.exportaciones++; else u.ediciones++;
    u.costo += +x.costo || 0;
  }
  return r;
}
// ¿puede pedirle algo a Claude? (el límite es por mes y por persona; null = sin límite)
export function puedeUsarClaude(usuario) {
  const m = leerEquipo()?.miembros.find((x) => x.id === usuario);
  if (!m?.limiteUsd && m?.limiteUsd !== 0) return {ok: true};
  const gastado = usoDelMes()[usuario]?.costo || 0;
  return gastado >= m.limiteUsd
    ? {ok: false, motivo: `Llegaste al límite del mes (US$ ${m.limiteUsd.toFixed(2)}; usado US$ ${gastado.toFixed(2)}). Pedile a un admin que lo suba.`}
    : {ok: true};
}

// ---------- sesiones y control de acceso
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((x) => x[0]));
export function quien(req) {
  if (!activo()) return {id: 'local', nombre: 'Local', rol: 'admin', solo: true};
  const t = cookies(req)[COOKIE], s = t && sesiones.get(t);
  if (!s || s.vence < Date.now()) { if (t) sesiones.delete(t); return null; }
  const m = leerEquipo().miembros.find((x) => x.id === s.usuario && x.activo);
  return m ? publico(m) : null;
}

export function entrar(req, res, {usuario, clave}) {
  const ip = req.socket.remoteAddress || '';
  const f = intentos.get(ip);
  if (f && f.hasta > Date.now()) throw new Error('Demasiados intentos. Esperá un minuto.');
  const m = leerEquipo()?.miembros.find((x) => x.id === String(usuario || '').toLowerCase().trim());
  // se calcula el hash aunque el usuario no exista, para no delatar cuáles existen
  const ok = claveOk(clave, m?.clave || FALSA) && m && m.activo;
  if (!ok) {
    const n = (f?.n || 0) + 1;
    intentos.set(ip, {n, hasta: n >= 5 ? Date.now() + 60000 : 0});
    registrar({usuario: m?.id || String(usuario || '').slice(0, 30), accion: 'login-fallido', ip});
    throw new Error(m && !m.activo ? 'Tu usuario está desactivado. Hablá con un admin.' : 'Usuario o clave incorrectos.');
  }
  intentos.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sesiones.set(token, {usuario: m.id, vence: Date.now() + DURACION});
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACION / 1000}`);
  registrar({usuario: m.id, accion: 'login', ip});
  return publico(m);
}
export function salir(req, res) {
  sesiones.delete(cookies(req)[COOKIE]);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

// Rutas que necesitan sesión cuando el equipo está activo. La interfaz (código de la app y la composición) se sirve
// sin sesión para poder mostrar el login; los datos (proyectos, videos, marcas, API) no.
export function protegida(url, REPO) {
  if (/^\/(api|media|salida|marca)\//.test(url) && !url.startsWith('/api/sesion')) return true;
  if (url.startsWith('/@fs/')) {
    const f = path.resolve(decodeURIComponent(url.slice(4).split('?')[0]));
    const libres = [path.join(REPO, 'app') + path.sep, path.join(REPO, 'template/reel/src') + path.sep];
    return !libres.some((l) => f.startsWith(l));
  }
  return false;
}
