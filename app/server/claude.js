// Claude como motor del editor: corre Claude Code (`claude -p`) en el repo, con la cuenta y los conectores
// de quien esté logueado en esta compu (Notion, Drive, ElevenLabs). Un trabajo a la vez.
//   GET  /api/claude/estado                    ¿está instalado claude? ¿hay un trabajo corriendo?
//   POST /api/claude/iniciar {modo, p, texto}  modo: "pedido" (brief → proyecto nuevo) o "cambios" (sobre el proyecto p)
//   GET  /api/claude/eventos                   progreso del trabajo actual (text/event-stream, repite lo ya pasado)
//   POST /api/claude/parar
// La sesión de Claude de cada proyecto se guarda en proyectos/<id>/.claude.json: los cambios siguen la misma
// conversación (como pide el brief: "se piden en la misma sesión donde se hizo el video").
import fs from 'node:fs';
import path from 'node:path';
import {spawn, execFile} from 'node:child_process';
import os from 'node:os';
import * as eq from './equipo.js';

// El Claude Code instalado para este usuario (~/.local/bin) va primero: en WSL el PATH también trae el de Windows,
// que usa otra configuración y otro login. EDITOR_CLAUDE_BIN lo fija a mano.
const BIN = process.env.EDITOR_CLAUDE_BIN
  || [path.join(os.homedir(), '.local/bin/claude')].find((f) => fs.existsSync(f)) || 'claude';
// avisos de Claude Code que no son errores del pedido
const RUIDO = /^(Ignoring \d+ permissions|Warning: no stdin|.*hasTrustDialogAccepted|trusted\. Run Claude Code)/;

const MODELO = process.env.EDITOR_CLAUDE_MODELO || '';           // default si la app no elige; vacío = el de la cuenta
const MODELOS = ['sonnet', 'opus', 'haiku', 'cuenta'];
// Herramientas internas que carga Claude: solo las que usa el editor. Baja el contexto de base de ~42k a ~12k tokens
// por paso (medido). ToolSearch hace falta para los conectores (Notion, Drive, ElevenLabs se cargan a demanda).
const HERRAMIENTAS = process.env.EDITOR_CLAUDE_TOOLS || 'Bash,Read,Edit,Write,Glob,Grep,ToolSearch';          // lo que puede elegir la app ('cuenta' = sin --model)
const PERMISOS = process.env.EDITOR_CLAUDE_PERMISOS || 'auto';   // auto: aprueba solo lo seguro; lo demás se deniega y se avisa

let trabajo = null;   // {id, modo, p, usuario, proceso, eventos, fin, clientes, antes}

// Motor: "cuenta" = el login de claude.ai de esta compu (plan y conectores de esa cuenta);
// "api" = clave de API de la agencia (se cobra por uso; los conectores de claude.ai no cargan con API key).
// La clave sale de ANTHROPIC_API_KEY o de <config>/anthropic.key (fuera del repo); nunca de la app.
function entorno() {
  const env = {...process.env};
  const m = eq.leerEquipo()?.motor || 'cuenta';
  if (m === 'cuenta') { delete env.ANTHROPIC_API_KEY; return env; }
  if (!env.ANTHROPIC_API_KEY) {
    try { env.ANTHROPIC_API_KEY = fs.readFileSync(path.join(eq.CONFIG, 'anthropic.key'), 'utf8').trim(); } catch { /* sin clave */ }
  }
  if (!env.ANTHROPIC_API_KEY) throw new Error(`El motor está en "api" pero no hay clave: guardala en ${path.join(eq.CONFIG, 'anthropic.key')} o en ANTHROPIC_API_KEY.`);
  return env;
}

const leer = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };

function detalle(REPO, nombre, input = {}) {
  const rel = (f) => (f ? path.relative(REPO, f) : '');
  if (nombre === 'Bash') return input.description || String(input.command || '').slice(0, 140);
  if (['Edit', 'Write', 'Read', 'NotebookEdit'].includes(nombre)) return rel(input.file_path);
  if (nombre === 'Glob' || nombre === 'Grep') return input.pattern || '';
  const m = /^mcp__(.+?)__(.+)$/.exec(nombre);
  if (m) return `${m[1].replace(/^claude_ai_/, '').replace(/_/g, ' ')}: ${m[2]}`;
  return '';
}
const NOMBRES = {Bash: 'Comando', Edit: 'Edita', Write: 'Escribe', Read: 'Lee', Glob: 'Busca', Grep: 'Busca', TodoWrite: 'Planifica', WebFetch: 'Web', WebSearch: 'Web'};
// pasos que cambian lo que se ve: la app recarga la vista previa
const CAMBIA = /make_words|make_clips|nuevo_proyecto|voz\.sh|proyecto\.json|guion\.json|edl\.tsv|brand\.json|data\.json/;

function emitir(ev) {
  trabajo.eventos.push(ev);
  for (const res of trabajo.clientes) res.write(`data: ${JSON.stringify(ev)}\n\n`);
}

function prompt(REPO, modo, p, texto, marca) {
  if (modo === 'pedido') {
    const pre = marca ? `Marca: ${marca}. Creá el proyecto con scripts/nuevo_proyecto.sh <cliente> <tema> --preset ${marca} `
      + `(presets/${marca}: brand, assets, voz y estilo por defecto; leé sus notas en preset.json).\n` : '';
    return `Pedido nuevo desde la app del editor. Seguí CLAUDE.md de punta a punta hasta dejar el reel armado en un proyecto `
      + `de la plantilla (proyectos/<cliente>-<tema>), con voz, tomas, subtítulos y estilo, y los stills revisados.\n${pre}\n${texto}`;
  }
  return `Cambios sobre proyectos/${p} (los tiempos m:ss son del reel; 0:00 = inicio). Aplicalos y dejá el proyecto actualizado `
    + `(make_words/make_clips según corresponda). Si un cambio es ambiguo, hacé lo más razonable y avisalo.\n\n${texto}`;
}

export function claude(REPO) {
  const SISTEMA = fs.readFileSync(path.join(REPO, 'app/server/prompt_app.md'), 'utf8');
  const PROY = path.join(REPO, 'proyectos');
  const proyectos = () => (fs.existsSync(PROY) ? fs.readdirSync(PROY) : []);

  function iniciar({modo, p, texto, marca, modelo, usuario}) {
    if (trabajo && !trabajo.fin) throw new Error(`Claude ya está trabajando${trabajo.usuario?.nombre && trabajo.usuario.id !== usuario?.id ? ` para ${trabajo.usuario.nombre}` : ''} en ${trabajo.p || 'un pedido nuevo'}. Esperá a que termine.`);
    const permiso = eq.puedeUsarClaude(usuario?.id);
    if (!permiso.ok) throw new Error(permiso.motivo);
    if (!texto?.trim()) throw new Error('falta el texto');
    if (modo === 'cambios' && !/^[a-z0-9][a-z0-9-]*$/.test(p || '')) throw new Error('falta el proyecto');
    const sesion = modo === 'cambios' ? leer(path.join(PROY, p, '.claude.json'), {}).sesion : null;
    if (marca && !/^[a-z0-9-]+$/.test(marca)) throw new Error('marca inválida');
    const args = ['-p', prompt(REPO, modo, p, texto, marca), '--output-format', 'stream-json', '--verbose',
      '--permission-mode', PERMISOS, '--append-system-prompt', SISTEMA,
      '--tools', HERRAMIENTAS, '--exclude-dynamic-system-prompt-sections'];
    if (modelo && !MODELOS.includes(modelo)) throw new Error('modelo inválido');
    const m = modelo === 'cuenta' ? '' : (modelo || MODELO);
    if (m) args.push('--model', m);
    if (sesion) args.push('--resume', sesion);
    const proceso = spawn(BIN, args, {cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], env: entorno()});
    trabajo = {id: Date.now(), modo, p, usuario, proceso, eventos: [], fin: null, clientes: new Set(), antes: new Set(proyectos()), pendientes: {}};
    emitir({tipo: 'inicio', modo, p, continua: !!sesion});
    let buf = '', sesionNueva = null, error = '';
    proceso.stderr.on('data', (b) => { error += b; });
    proceso.on('error', (e) => { error += e.message; });
    proceso.stdout.on('data', (b) => {
      buf += b;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const linea = buf.slice(0, i); buf = buf.slice(i + 1);
        let e; try { e = JSON.parse(linea); } catch { continue; }
        if (e.type === 'system' && e.subtype === 'init') {
          sesionNueva = e.session_id;
          const con = (e.mcp_servers || []).filter((s) => s.status === 'connected').map((s) => s.name.replace(/^claude\.ai /, ''));
          emitir({tipo: 'conectores', lista: con});
        } else if (e.type === 'assistant') {
          for (const c of e.message?.content || []) {
            if (c.type === 'text' && c.text.trim()) emitir({tipo: 'texto', texto: c.text.trim()});
            if (c.type === 'tool_use') {
              trabajo.pendientes[c.id] = c;
              emitir({tipo: 'paso', herramienta: NOMBRES[c.name] || c.name.replace(/^mcp__.*?__/, ''), detalle: detalle(REPO, c.name, c.input)});
            }
          }
        } else if (e.type === 'user') {
          for (const c of e.message?.content || []) {
            const t = c.type === 'tool_result' && trabajo.pendientes[c.tool_use_id];
            if (t && CAMBIA.test(JSON.stringify(t.input))) emitir({tipo: 'refrescar'});
          }
        } else if (e.type === 'result') {
          trabajo.resultado = e;
        }
      }
    });
    proceso.on('close', (code) => {
      const r = trabajo.resultado || {};
      // proyecto resultante: el de los cambios, o el que apareció nuevo en proyectos/ (o el que Claude nombró al final)
      let proy = trabajo.p;
      if (modo === 'pedido') {
        const nuevos = proyectos().filter((x) => !trabajo.antes.has(x));
        const nombrado = /PROYECTO:\s*proyectos\/([a-z0-9-]+)/.exec(r.result || '');
        proy = nombrado?.[1] || nuevos[0] || null;
      }
      if (proy && sesionNueva && fs.existsSync(path.join(PROY, proy))) {
        fs.writeFileSync(path.join(PROY, proy, '.claude.json'), JSON.stringify({sesion: r.session_id || sesionNueva}) + '\n');
      }
      trabajo.fin = {
        tipo: 'fin', ok: code === 0 && !r.is_error, proyecto: proy, costo: r.total_cost_usd, continua: !!sesion, modelos: Object.keys(r.modelUsage || {}), segundos: Math.round((r.duration_ms || 0) / 1000),
        denegados: (r.permission_denials || []).map((d) => `${d.tool_name}${d.tool_input?.command ? ': ' + String(d.tool_input.command).slice(0, 100) : ''}`),
        error: code === 0 && !r.is_error ? '' : (error.trim().split('\n').filter((l) => l.trim() && !RUIDO.test(l)).slice(-6).join('\n') || r.result || `claude terminó con código ${code}`),
      };
      // costo de esta corrida: con --resume, total_cost_usd es el acumulado de la sesión; se descuenta lo ya registrado
      const previo = sesion ? eq.leerRegistro().filter((x) => x.sesion === sesion || x.sesion === (r.session_id || sesionNueva)).reduce((a, x) => a + (+x.costo || 0), 0) : 0;
      eq.registrar({usuario: usuario?.id, accion: modo, proyecto: proy, ok: trabajo.fin.ok, sesion: r.session_id || sesionNueva,
        costo: Math.max(0, +((r.total_cost_usd || 0) - previo).toFixed(4)), modelo: trabajo.fin.modelos.join(','), segundos: trabajo.fin.segundos,
        motor: eq.leerEquipo()?.motor || 'cuenta'});
      emitir(trabajo.fin);
      for (const res of trabajo.clientes) res.end();
      trabajo.clientes.clear();
    });
    return {ok: true};
  }

  return {
    estado: () => new Promise((ok) => execFile(BIN, ['--version'], (err, out) => ok({
      disponible: !err, version: err ? null : out.trim(), corriendo: !!(trabajo && !trabajo.fin), modo: trabajo?.modo, p: trabajo?.p, de: trabajo?.usuario?.nombre, motor: eq.leerEquipo()?.motor || 'cuenta',
    }))),
    iniciar,
    parar: () => { if (trabajo && !trabajo.fin) trabajo.proceso.kill('SIGINT'); return {ok: true}; },
    eventos: (req, res) => {
      res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive'});
      if (!trabajo) { res.write(`data: ${JSON.stringify({tipo: 'nada'})}\n\n`); return res.end(); }
      for (const ev of trabajo.eventos) res.write(`data: ${JSON.stringify(ev)}\n\n`);
      if (trabajo.fin) return res.end();
      trabajo.clientes.add(res);
      req.on('close', () => trabajo?.clientes.delete(res));
    },
  };
}
