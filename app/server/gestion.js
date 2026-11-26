// Gestión desde la app, para que el equipo cambie todo sin tocar código:
//   proyectos (eliminar a la papelera, recuperar, duplicar, renombrar), marcas (presets/: datos, colores, fuentes,
//   logos, voz, notas del design system, estrategia; nueva y a la papelera) y ajustes (plantillas de pedido,
//   instrucciones para Claude, guía). Cada ajuste guarda la versión anterior y puede volver al original del repo.
// Rutas (las llama api.js; todas piden sesión si hay equipo):
//   DELETE /api/p/<id>                 a proyectos/.papelera/      POST /api/p/<id>/duplicar {nuevo} · /renombrar {nuevo}
//   GET    /api/papelera               proyectos y marcas borrados  POST /api/papelera/<nombre>/recuperar
//   GET    /api/marcas/<id>            brand.json + preset.json     POST /api/marcas/<id> {brand, preset}   DELETE (papelera)
//   POST   /api/marcas {id, nombre}    marca nueva                  POST /api/marcas/<id>/archivo?tipo=logo|isotipo|fuente&nombre=
//   GET    /api/ajustes/<clave>        texto + si cambió            POST /api/ajustes/<clave> {texto} · /<clave>/original
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';

const ID_OK = /^[a-z0-9][a-z0-9-]{0,60}$/;
const leer = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const escribir = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n');
const sello = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const slug = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const correr = (REPO, cmd, args) => new Promise((ok, mal) => execFile(cmd, args, {cwd: REPO, maxBuffer: 1 << 22},
  (e, out, err) => (e ? mal(new Error((out + err).trim().split('\n').slice(-4).join('\n') || e.message)) : ok(out.trim()))));

// Ajustes editables: archivos de texto del repo que el equipo puede cambiar desde la app
const AJUSTES = {
  plantillas: {archivo: 'app/plantillas.json', nombre: 'Plantillas de pedido', json: true},
  instrucciones: {archivo: 'app/server/prompt_app.md', nombre: 'Instrucciones para Claude (pedidos y cambios)'},
  soporte: {archivo: 'app/server/prompt_soporte.md', nombre: 'Instrucciones para Claude (soporte)'},
  guia: {archivo: 'docs/guia.md', nombre: 'Guía del editor'},
};

export function gestion(REPO, registrar) {
  const PROY = path.join(REPO, 'proyectos'), PRES = path.join(REPO, 'presets');
  const papelera = (base) => { const d = path.join(base, '.papelera'); fs.mkdirSync(d, {recursive: true}); return d; };
  const existe = (base, id) => ID_OK.test(id) && fs.existsSync(path.join(base, id));
  const libre = (base, id) => {
    if (!ID_OK.test(id)) throw new Error('nombre inválido: letras minúsculas, números y guiones');
    if (fs.existsSync(path.join(base, id))) throw new Error(`ya existe ${id}`);
  };

  // ---------- proyectos
  function borrarProyecto(id, quien) {
    if (!existe(PROY, id)) throw new Error('no existe el proyecto');
    const destino = path.join(papelera(PROY), `${id}--${sello()}`);
    fs.renameSync(path.join(PROY, id), destino);
    registrar({usuario: quien, accion: 'eliminar', proyecto: id});
    return {ok: true, papelera: path.basename(destino)};
  }
  async function duplicarProyecto(id, nuevo, quien) {
    if (!existe(PROY, id)) throw new Error('no existe el proyecto');
    nuevo = slug(nuevo); libre(PROY, nuevo);
    // sin videos renderizados, ni la sesión de Claude (la copia arranca su propia conversación)
    const src = path.join(PROY, id);
    fs.cpSync(src, path.join(PROY, nuevo), {recursive: true, filter: (f) => {
      const r = path.relative(src, f).split(path.sep).join('/');
      return !/^out(\/|$)/.test(r) && !/(^|\/)node_modules(\/|$)/.test(r) && !r.endsWith('.claude.json');
    }});
    registrar({usuario: quien, accion: 'duplicar', proyecto: nuevo, detalle: `copia de ${id}`});
    return {ok: true, id: nuevo};
  }
  function renombrarProyecto(id, nuevo, quien) {
    if (!existe(PROY, id)) throw new Error('no existe el proyecto');
    nuevo = slug(nuevo); libre(PROY, nuevo);
    fs.renameSync(path.join(PROY, id), path.join(PROY, nuevo));
    registrar({usuario: quien, accion: 'renombrar', proyecto: nuevo, detalle: `antes ${id}`});
    return {ok: true, id: nuevo};
  }
  function verPapelera() {
    const lista = (base, tipo) => (fs.existsSync(path.join(base, '.papelera')) ? fs.readdirSync(path.join(base, '.papelera')) : [])
      .map((n) => ({nombre: n, tipo, id: n.split('--')[0], fecha: n.split('--')[1] || ''})).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return [...lista(PROY, 'proyecto'), ...lista(PRES, 'marca')];
  }
  function recuperar(nombre, quien) {
    for (const [base, tipo] of [[PROY, 'proyecto'], [PRES, 'marca']]) {
      const f = path.join(base, '.papelera', nombre);
      if (!nombre.includes('/') && fs.existsSync(f)) {
        let id = nombre.split('--')[0];
        if (fs.existsSync(path.join(base, id))) id = `${id}-recuperado`;
        libre(base, id);
        fs.renameSync(f, path.join(base, id));
        registrar({usuario: quien, accion: 'recuperar', detalle: `${tipo} ${id}`});
        return {ok: true, id, tipo};
      }
    }
    throw new Error('no está en la papelera');
  }

  // ---------- marcas (presets/<id>)
  function verMarca(id) {
    if (!existe(PRES, id) || !fs.existsSync(path.join(PRES, id, 'preset.json'))) throw new Error('no existe la marca');
    const pub = path.join(PRES, id, 'public');
    const lista = (sub) => (fs.existsSync(path.join(pub, sub)) ? fs.readdirSync(path.join(pub, sub)).filter((f) => !f.startsWith('.')).sort() : []);
    return {id, brand: leer(path.join(PRES, id, 'brand.json'), {}), preset: leer(path.join(PRES, id, 'preset.json'), {}),
      archivos: {brand: lista('brand'), fonts: lista('fonts'), stickers: lista('stickers')}, base: `/marca/${id}/`};
  }
  function guardarMarca(id, {brand, preset}, quien) {
    const m = verMarca(id);
    if (brand) {
      if (!brand.nombre || !brand.colores || typeof brand.colores !== 'object' || !brand.fuentes?.G || !brand.fuentes?.B) throw new Error('a la marca le falta nombre, colores o las fuentes G y B');
      for (const [k, v] of Object.entries(brand.colores)) if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(`color ${k}: tiene que ser #RRGGBB`);
      escribir(path.join(PRES, id, 'brand.json'), {...m.brand, ...brand});
    }
    if (preset) escribir(path.join(PRES, id, 'preset.json'), {...m.preset, ...preset});
    registrar({usuario: quien, accion: 'marca', detalle: `${id}: ${[brand && 'marca', preset && 'preset'].filter(Boolean).join(' y ')}`});
    return verMarca(id);
  }
  function nuevaMarca({id, nombre}, quien) {
    id = slug(id || nombre); libre(PRES, id);
    const d = path.join(PRES, id);
    fs.mkdirSync(path.join(d, 'public/brand'), {recursive: true}); fs.mkdirSync(path.join(d, 'public/fonts'), {recursive: true});
    // arranca con DM Sans (libre) y colores neutros: se cambian desde la app o con el design system
    const dm = path.join(PRES, 'holamarketing/public/fonts/dm-sans-latin-700-normal.woff2');
    if (fs.existsSync(dm)) fs.copyFileSync(dm, path.join(d, 'public/fonts/dm-sans-latin-700-normal.woff2'));
    const fuente = (mayusculas) => ({familia: 'DM Sans', archivo: 'dm-sans-latin-700-normal.woff2', peso: 700, mayusculas, interlineado: 1, espaciado: 0, ancho: mayusculas ? 0.64 : 0.55, respaldo: 'Arial, sans-serif'});
    escribir(path.join(d, 'brand.json'), {nombre: String(nombre || id).toUpperCase(), handle: `@${id}`, logo: null,
      colores: {texto: '#FFFFFF', fondo: '#111111', acento: '#F9CA12'}, acentos: ['acento'], fuentes: {G: fuente(false), B: fuente(false), S: fuente(true)},
      outro: {fondo: 'fondo', fuenteHandle: 'S', colorHandle: 'texto'}});
    escribir(path.join(d, 'preset.json'), {marca: nombre || id, designSystem: null, driveMadre: null,
      voz: {voice_id: 'YLtqUTaEXb7a9MAYuJu4', nombre: 'Julieta'}, notas: [], estrategia: [], estilo: {}});
    registrar({usuario: quien, accion: 'marca', detalle: `nueva: ${id}`});
    return verMarca(id);
  }
  function borrarMarca(id, quien) {
    if (!existe(PRES, id)) throw new Error('no existe la marca');
    fs.renameSync(path.join(PRES, id), path.join(papelera(PRES), `${id}--${sello()}`));
    registrar({usuario: quien, accion: 'marca', detalle: `a la papelera: ${id}`});
    return {ok: true};
  }
  async function subirArchivoMarca(id, tipo, nombre, cuerpo, quien) {
    const m = verMarca(id);
    const ext = path.extname(nombre).toLowerCase();
    const ok = {logo: ['.png', '.svg', '.webp'], isotipo: ['.png', '.svg', '.webp'], sticker: ['.png', '.svg', '.webp'], fuente: ['.woff2', '.woff', '.ttf', '.otf']}[tipo];
    if (!ok) throw new Error('tipo: logo, isotipo, sticker o fuente');
    if (!ok.includes(ext)) throw new Error(`formato ${ext || '?'}: se aceptan ${ok.join(', ')}`);
    const limpio = path.basename(nombre).replace(/[^\w.-]/g, '_');
    const carpeta = path.join(PRES, id, 'public', tipo === 'fuente' ? 'fonts' : tipo === 'sticker' ? 'stickers' : 'brand');
    fs.mkdirSync(carpeta, {recursive: true});
    fs.writeFileSync(path.join(carpeta, limpio), cuerpo);
    let ancho = null;
    if (tipo === 'fuente') ancho = JSON.parse(await correr(REPO, 'python3', ['scripts/medir_fuente.py', path.join(carpeta, limpio)]));
    if (tipo === 'logo') guardarMarca(id, {brand: {...m.brand, logo: limpio}}, quien);
    if (tipo === 'isotipo') guardarMarca(id, {brand: {...m.brand, outro: {...(m.brand.outro || {}), isotipo: limpio}}}, quien);
    registrar({usuario: quien, accion: 'marca', detalle: `${id}: sube ${tipo} ${limpio}`});
    return {...verMarca(id), subido: limpio, ancho};
  }

  // ---------- ajustes
  function verAjuste(clave) {
    const a = AJUSTES[clave]; if (!a) throw new Error('ajuste desconocido');
    const f = path.join(REPO, a.archivo);
    return {clave, nombre: a.nombre, archivo: a.archivo, texto: fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''};
  }
  function guardarAjuste(clave, texto, quien) {
    const a = AJUSTES[clave]; if (!a) throw new Error('ajuste desconocido');
    if (typeof texto !== 'string' || !texto.trim()) throw new Error('está vacío');
    if (a.json) { try { JSON.parse(texto); } catch (e) { throw new Error(`no es JSON válido: ${e.message}`); } }
    const f = path.join(REPO, a.archivo);
    // la versión anterior queda guardada al lado (.versiones/), por si hay que volver
    if (fs.existsSync(f)) {
      const dir = path.join(path.dirname(f), '.versiones'); fs.mkdirSync(dir, {recursive: true});
      fs.copyFileSync(f, path.join(dir, `${path.basename(f)}.${sello()}`));
    }
    fs.writeFileSync(f, texto.endsWith('\n') ? texto : texto + '\n');
    registrar({usuario: quien, accion: 'ajuste', detalle: a.nombre});
    return verAjuste(clave);
  }
  async function ajusteOriginal(clave, quien) {
    const a = AJUSTES[clave]; if (!a) throw new Error('ajuste desconocido');
    const texto = await correr(REPO, 'git', ['show', `HEAD:${a.archivo}`])
      .catch(() => { throw new Error('este ajuste todavía no tiene una versión original en el repositorio'); });
    return guardarAjuste(clave, texto + '\n', quien);
  }

  // ---------- router (devuelve undefined si la ruta no es de acá)
  return async ({que, id, accion, metodo, datos, url, cuerpo, yo}) => {
    const quien = yo?.id;
    if (que === 'p' && id && metodo === 'DELETE' && !accion) return borrarProyecto(id, quien);
    if (que === 'p' && id && accion === 'duplicar') return duplicarProyecto(id, (await datos()).nuevo, quien);
    if (que === 'p' && id && accion === 'renombrar') return renombrarProyecto(id, (await datos()).nuevo, quien);
    if (que === 'papelera') return accion === 'recuperar' && metodo === 'POST' ? recuperar(id, quien) : verPapelera();
    if (que === 'marcas') {
      if (!id && metodo === 'POST') return nuevaMarca(await datos(), quien);
      if (id && accion === 'archivo' && metodo === 'POST') return subirArchivoMarca(id, url.searchParams.get('tipo'), url.searchParams.get('nombre') || '', await cuerpo(), quien);
      if (id && metodo === 'DELETE') return borrarMarca(id, quien);
      if (id && metodo === 'POST') return guardarMarca(id, await datos(), quien);
      if (id) return verMarca(id);
    }
    if (que === 'ajustes') {
      if (!id) return Object.entries(AJUSTES).map(([clave, a]) => ({clave, nombre: a.nombre, archivo: a.archivo}));
      if (accion === 'original' && metodo === 'POST') return ajusteOriginal(id, quien);
      if (metodo === 'POST') return guardarAjuste(id, (await datos()).texto, quien);
      return verAjuste(id);
    }
    if (que === 'guia') return verAjuste('guia');
    return undefined;
  };
}
