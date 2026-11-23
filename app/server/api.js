// API local del editor: lee y escribe los archivos del proyecto y corre los scripts del repo.
// Corre dentro del servidor de Vite (vite.config.js), solo en 127.0.0.1. Rutas:
//   GET  /api/proyectos                      lista de proyectos de la plantilla
//   GET  /api/opciones                       opciones y defaults de estilo (scripts/estilo.py --opciones)
//   GET  /api/p/<id>                         todo lo que la app necesita del proyecto
//   POST /api/p/<id>/guion     {guion}       guarda guion.json y corre make_words.py
//   POST /api/p/<id>/edl       {edl}         guarda edl.tsv y corre make_clips.py
//   POST /api/p/<id>/proyecto  {cambios}     mezcla en proyecto.json (estilo, música, volúmenes) y corre los dos scripts
//   POST /api/p/<id>/subir?tipo=musica|toma&nombre=x   (cuerpo = archivo)
//   GET  /api/p/<id>/miniatura?archivo=x&t=1.5
//   GET  /api/p/<id>/exportar                render.sh con el progreso en vivo (text/event-stream)
//   /api/claude/...                         Claude como motor (server/claude.js)
//   GET  /media/<id>/<ruta>                  archivos de reel/public (con Range, para el video)
//   GET  /salida/<id>/<archivo>.mp4          videos exportados (out/)
import fs from 'node:fs';
import path from 'node:path';
import {execFile, spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {claude} from './claude.js';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROY = path.join(REPO, 'proyectos');
const ID_OK = /^[a-z0-9][a-z0-9-]*$/;
const TIPOS = {'.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.m4a': 'audio/mp4', '.mov': 'video/quicktime'};

const leer = (f, def) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : def);
const escribir = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n');
const dir = (id) => {
  if (!ID_OK.test(id)) throw new Error('proyecto inválido');
  const d = path.join(PROY, id);
  if (!fs.existsSync(path.join(d, 'reel/src/data.json'))) throw new Error(`no existe el proyecto ${id}`);
  return d;
};
// ruta dentro de una carpeta, sin escaparse de ella
const dentro = (base, rel) => {
  const f = path.resolve(base, rel);
  if (f !== base && !f.startsWith(base + path.sep)) throw new Error('ruta inválida');
  return f;
};

const correr = (cmd, args) => new Promise((ok, mal) => {
  execFile(cmd, args, {cwd: REPO, maxBuffer: 1 << 24}, (err, stdout, stderr) => {
    const salida = (stdout + stderr).trim();
    if (err) mal(new Error(salida.split('\n').slice(-8).join('\n') || err.message)); else ok(salida);
  });
});

const leerEdl = (d) => fs.readFileSync(path.join(d, 'edl.tsv'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => {
  const [start, end, file, inPoint, pos] = l.split('\t');
  return {start: +start, end: +end, file, inPoint: +inPoint, pos: pos || ''};
});

const archivos = (carpeta, exts) => (fs.existsSync(carpeta)
  ? fs.readdirSync(carpeta).filter((f) => exts.includes(path.extname(f).toLowerCase())).sort() : []);

function todo(id) {
  const d = dir(id);
  return {
    id,
    data: leer(path.join(d, 'reel/src/data.json')),
    brand: leer(path.join(d, 'reel/src/brand.json')),
    proyecto: leer(path.join(d, 'proyecto.json'), {}),
    guion: leer(path.join(d, 'guion.json'), []),
    edl: leerEdl(d),
    tomas: archivos(path.join(d, 'raw'), ['.mp4', '.mov', '.m4v', '.webm']),
    musicas: archivos(path.join(d, 'reel/public/musica'), ['.mp3', '.wav', '.m4a']).map((f) => 'musica/' + f),
    videos: archivos(path.join(d, 'out'), ['.mp4']).filter((f) => !f.startsWith('.')),
  };
}

// make_words.py necesita la voz transcrita; sin audio/voz.json se salta (proyecto sin voz)
async function regenerar(id, {palabras = true, tomas = true} = {}) {
  const d = dir(id), rel = path.relative(REPO, d), log = [];
  if (palabras && fs.existsSync(path.join(d, 'audio/voz.json'))) log.push(await correr('python3', ['scripts/make_words.py', rel]));
  if (tomas) log.push(await correr('python3', ['scripts/make_clips.py', rel]));
  log.push((await correr('python3', ['scripts/zona_segura.py', rel]).catch((e) => e.message)));
  return {...todo(id), log: log.join('\n')};
}

const mezclar = (a, b) => {
  const o = {...a};
  for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a?.[k] && typeof a[k] === 'object' ? mezclar(a[k], v) : v;
  return o;
};

const cuerpo = (req) => new Promise((ok, mal) => {
  const partes = []; req.on('data', (c) => partes.push(c)); req.on('end', () => ok(Buffer.concat(partes))); req.on('error', mal);
});

function servirArchivo(req, res, f) {
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.statusCode = 404; return res.end('no existe'); }
  const tam = fs.statSync(f).size;
  res.setHeader('Content-Type', TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache');
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const ini = m[1] ? +m[1] : 0, fin = m[2] ? Math.min(+m[2], tam - 1) : tam - 1;
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${ini}-${fin}/${tam}`);
    res.setHeader('Content-Length', fin - ini + 1);
    return fs.createReadStream(f, {start: ini, end: fin}).pipe(res);
  }
  res.setHeader('Content-Length', tam);
  fs.createReadStream(f).pipe(res);
}

function exportar(id, res) {
  const d = dir(id);
  res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive'});
  const enviar = (ev, x) => res.write(`event: ${ev}\ndata: ${JSON.stringify(x)}\n\n`);
  const p = spawn('bash', ['scripts/render.sh', path.relative(REPO, d)], {cwd: REPO});
  let todoLog = '';
  const linea = (b) => { const t = b.toString(); todoLog += t; t.split('\n').filter(Boolean).forEach((l) => enviar('log', l)); };
  p.stdout.on('data', linea); p.stderr.on('data', linea);
  p.on('close', (code) => {
    const mp4 = /(\S+\.mp4)\s*$/m.exec(todoLog.split('\n').filter((l) => l.trim().endsWith('.mp4')).pop() || '');
    enviar('fin', {ok: code === 0, revisar: /REVISAR/.test(todoLog), video: mp4 ? path.basename(mp4[1]) : null});
    res.end();
  });
  res.on('close', () => p.exitCode === null && p.kill());
}

export function api() {
  const motor = claude(REPO);
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://x');
    const partes = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const json = (x, st = 200) => { res.statusCode = st; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(x)); };
    try {
      if (partes[0] === 'media' && partes.length >= 3) return servirArchivo(req, res, dentro(path.join(dir(partes[1]), 'reel/public'), partes.slice(2).join('/')));
      if (partes[0] === 'salida' && partes.length === 3) return servirArchivo(req, res, dentro(path.join(dir(partes[1]), 'out'), partes[2]));
      if (partes[0] !== 'api') return next();
      const [, que, id, accion] = partes;
      if (que === 'proyectos') {
        const lista = fs.existsSync(PROY) ? fs.readdirSync(PROY).filter((p) => ID_OK.test(p)
          && fs.existsSync(path.join(PROY, p, 'reel/src/data.json')) && !fs.existsSync(path.join(PROY, p, 'reel/src/.propia'))) : [];
        return json(lista.map((p) => ({id: p, marca: leer(path.join(PROY, p, 'reel/src/brand.json'), {}).nombre || p,
          cambiado: fs.statSync(path.join(PROY, p, 'reel/src/data.json')).mtimeMs})).sort((a, b) => b.cambiado - a.cambiado));
      }
      if (que === 'claude') {
        if (id === 'estado') return json(await motor.estado());
        if (id === 'eventos') return motor.eventos(req, res);
        if (id === 'parar' && req.method === 'POST') return json(motor.parar());
        if (id === 'iniciar' && req.method === 'POST') return json(motor.iniciar(JSON.parse((await cuerpo(req)).toString() || '{}')));
        return json({error: 'ruta desconocida'}, 404);
      }
      if (que === 'opciones') return json(JSON.parse(await correr('python3', ['scripts/estilo.py', '--opciones'])));
      if (que !== 'p' || !id) return json({error: 'ruta desconocida'}, 404);
      const d = dir(id);
      if (!accion && req.method === 'GET') return json(todo(id));
      if (accion === 'miniatura') {
        const archivo = url.searchParams.get('archivo'), t = Math.max(0, +url.searchParams.get('t') || 0);
        const src = dentro(path.join(d, 'raw'), archivo);
        const out = path.join(d, 'thumbs', `app_${archivo.replace(/[^\w.-]/g, '_')}_${t.toFixed(1)}.jpg`);
        if (!fs.existsSync(out)) {
          fs.mkdirSync(path.dirname(out), {recursive: true});
          await correr('ffmpeg', ['-nostdin', '-v', 'error', '-ss', String(t), '-i', src, '-frames:v', '1', '-vf', 'scale=-2:240', '-y', out]);
        }
        return servirArchivo(req, res, out);
      }
      if (accion === 'exportar') return exportar(id, res);
      if (req.method !== 'POST') return json({error: 'método'}, 405);
      if (accion === 'subir') {
        const tipo = url.searchParams.get('tipo'), nombre = path.basename(url.searchParams.get('nombre') || '').replace(/[^\w.\- ]/g, '_');
        if (!nombre) return json({error: 'falta el nombre'}, 400);
        const carpeta = tipo === 'musica' ? path.join(d, 'reel/public/musica') : path.join(d, 'raw');
        fs.mkdirSync(carpeta, {recursive: true});
        fs.writeFileSync(dentro(carpeta, nombre), await cuerpo(req));
        return json(todo(id));
      }
      const datos = JSON.parse((await cuerpo(req)).toString() || '{}');
      if (accion === 'guion') {
        escribir(path.join(d, 'guion.json'), datos.guion);
        return json(await regenerar(id, {tomas: false}));
      }
      if (accion === 'edl') {
        let t = 0;   // la línea de tiempo se recalcula en orden: cada toma dura lo que dice
        const filas = datos.edl.map((c) => { const dur = Math.max(0.2, +c.end - +c.start); const f = {...c, start: +t.toFixed(2), end: +(t + dur).toFixed(2)}; t += dur; return f; });
        fs.writeFileSync(path.join(d, 'edl.tsv'), filas.map((c) => [c.start.toFixed(2), c.end.toFixed(2), c.file, (+c.inPoint).toFixed(2), c.pos || ''].join('\t').replace(/\t$/, '')).join('\n') + '\n');
        const p = leer(path.join(d, 'proyecto.json'), {});
        if (p.duration) { delete p.duration; escribir(path.join(d, 'proyecto.json'), p); }   // la duración pasa a ser la del EDL
        return json(await regenerar(id, {palabras: false}));
      }
      if (accion === 'proyecto') {
        const f = path.join(d, 'proyecto.json');
        escribir(f, mezclar(leer(f, {}), datos.cambios || {}));
        return json(await regenerar(id));
      }
      return json({error: 'acción desconocida'}, 404);
    } catch (e) {
      return json({error: e.message}, 400);
    }
  };
}
