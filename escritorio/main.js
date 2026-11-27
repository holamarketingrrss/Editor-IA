// App de escritorio del Editor IA (Windows y Mac). Guía a la persona por los pasos y después abre el editor en su ventana:
//   1. GitHub: inicio de sesión (device flow) y chequeo de que siga siendo colaboradora del repo (acceso.js).
//   2. Windows: WSL con Ubuntu (el editor corre ahí; en Mac corre directo).
//   3. Editor: lo baja la primera vez y lo actualiza cada vez que abre (con el acceso de GitHub; sin "git pull" a mano).
//   4. Herramientas: la primera vez abre una terminal con el instalador (instalar/mac.sh o instalar/linux.sh).
//   5. Claude: la sesión de Claude Code con la cuenta de la agencia.
//   6. Arranca el editor (localhost:4321) y lo muestra. Cada 30 min vuelve a chequear el acceso.
const {app, BrowserWindow, ipcMain, shell, safeStorage, Menu, dialog} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {spawn, execFile} = require('node:child_process');
const acceso = require('./acceso.js');

const WIN = process.platform === 'win32';
const PUERTO = 4321;
const URL_EDITOR = `http://127.0.0.1:${PUERTO}`;
const DATOS = () => app.getPath('userData');
let ventana = null, servidor = null, distro = null, revision = null;

// ---------- sesión de GitHub guardada cifrada por el sistema (Keychain en Mac, DPAPI en Windows)
const archivoSesion = () => path.join(DATOS(), 'sesion.bin');
const archivoEstado = () => path.join(DATOS(), 'estado.json');
const leerToken = () => { try { return safeStorage.decryptString(fs.readFileSync(archivoSesion())); } catch { return null; } };
const guardarToken = (t) => fs.writeFileSync(archivoSesion(), safeStorage.encryptString(t));
const borrarToken = () => { try { fs.unlinkSync(archivoSesion()); } catch { /* no había */ } };
const estado = () => { try { return JSON.parse(fs.readFileSync(archivoEstado(), 'utf8')); } catch { return {}; } };
const guardarEstado = (e) => fs.writeFileSync(archivoEstado(), JSON.stringify({...estado(), ...e}));

// ---------- comandos: en Mac, bash del sistema; en Windows, adentro de Ubuntu (WSL)
const PATH_MAC = ['/opt/homebrew/opt/node@22/bin', '/usr/local/opt/node@22/bin', '/opt/homebrew/bin', '/usr/local/bin', `${os.homedir()}/.local/bin`].join(':');
function comando(cmd, {token, alSalir} = {}) {
  const env = {...process.env};
  if (token) env.EDITOR_GH_TOKEN = token;
  if (WIN) {
    env.WSLENV = [env.WSLENV, token ? 'EDITOR_GH_TOKEN/u' : null].filter(Boolean).join(':');
    return spawn('wsl.exe', ['-d', distro, '--', 'bash', '-lc', cmd], {env, windowsHide: true});
  }
  env.PATH = `${PATH_MAC}:${env.PATH}`;
  return spawn('/bin/bash', ['-lc', cmd], {env, detached: true});
}
const correr = (cmd, opciones = {}) => new Promise((ok) => {
  const p = comando(cmd, opciones); let salida = '';
  p.stdout.on('data', (d) => { salida += d; }); p.stderr.on('data', (d) => { salida += d; });
  p.on('close', (code) => ok({code, salida: salida.trim()})); p.on('error', (e) => ok({code: -1, salida: e.message}));
});
// terminal visible para lo que necesita a la persona (contraseña de la compu, crear el usuario de Ubuntu, login de Claude)
function terminal(cmd) {
  if (WIN) return spawn('cmd.exe', ['/c', 'start', '"Editor IA"', 'wsl.exe', '-d', distro, '--', 'bash', '-lc', `${cmd}; echo; read -p "Listo. Enter para cerrar"`], {detached: true});
  const esc = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return execFile('osascript', ['-e', `tell application "Terminal" to do script "export PATH=${PATH_MAC}:$PATH; ${esc}"`, '-e', 'tell application "Terminal" to activate']);
}
// git con el acceso de GitHub de la persona, sin guardarlo en el repo
const GIT = 'git -c http.extraHeader="Authorization: Basic $(printf "x-access-token:%s" "$EDITOR_GH_TOKEN" | base64 | tr -d "\\n")"';

const avisar = (paso, datos = {}) => ventana?.webContents.send('paso', {paso, ...datos});

// ---------- pasos
async function pasoGithub() {
  avisar('github', {estado: 'chequeando'});
  let token = leerToken();
  while (true) {
    if (!token) {
      const codigo = await acceso.pedirCodigo();
      avisar('github', {estado: 'codigo', codigo: codigo.user_code, url: codigo.verification_uri});
      shell.openExternal(codigo.verification_uri);
      token = await acceso.esperarToken(codigo);
      guardarToken(token);
    }
    const r = await acceso.chequear(token, {ultimoOk: estado().ultimoOk || 0});
    if (r.estado === 'ok') { guardarEstado({ultimoOk: Date.now(), usuario: r.usuario}); avisar('github', {estado: 'ok', usuario: r.usuario}); return token; }
    if (r.estado === 'sin-conexion-ok') { avisar('github', {estado: 'ok', usuario: estado().usuario, sinConexion: true}); return token; }
    if (r.estado === 'token-invalido') { borrarToken(); token = null; continue; }
    if (r.estado === 'sin-acceso') { avisar('github', {estado: 'sin-acceso', usuario: r.usuario}); return null; }
    avisar('github', {estado: 'sin-conexion'}); return null;
  }
}

async function pasoWindows() {
  if (!WIN) return true;
  avisar('sistema', {estado: 'chequeando'});
  const r = await new Promise((ok) => execFile('wsl.exe', ['-l', '-q'], {encoding: 'utf16le', windowsHide: true}, (e, out) => ok(e ? '' : out)));
  distro = r.split(/\r?\n/).map((x) => x.replace(/\0/g, '').trim()).find((x) => /ubuntu/i.test(x)) || null;
  if (!distro) { avisar('sistema', {estado: 'falta-wsl'}); return false; }
  const u = await correr('whoami');
  if (u.code !== 0 || /root/.test(u.salida)) { avisar('sistema', {estado: 'falta-usuario'}); return false; }
  avisar('sistema', {estado: 'ok', detalle: distro});
  return true;
}

async function pasoEditor(token) {
  avisar('editor', {estado: 'chequeando'});
  const hay = await correr('[ -d ~/Editor-IA/.git ] && echo si');
  if (!/si/.test(hay.salida)) {
    avisar('editor', {estado: 'bajando'});
    const c = await correr(`command -v git >/dev/null || { echo "falta git"; exit 9; }; ${GIT} clone -q https://github.com/${acceso.REPO}.git ~/Editor-IA`, {token});
    if (c.code === 9) { avisar('editor', {estado: 'falta-git'}); return false; }
    if (c.code !== 0) { avisar('editor', {estado: 'error', detalle: c.salida.slice(-300)}); return false; }
  } else {
    avisar('editor', {estado: 'actualizando'});
    const a = await correr(`cd ~/Editor-IA && ${GIT} pull -q --ff-only`, {token});
    if (a.code !== 0) avisar('editor', {estado: 'aviso', detalle: 'No se pudo actualizar (¿sin conexión o con cambios locales?). Sigo con la versión que hay.'});
  }
  const v = await correr('cd ~/Editor-IA && git log -1 --format="%h · %cd" --date=short');
  avisar('editor', {estado: 'ok', detalle: v.salida});
  return true;
}

async function pasoHerramientas() {
  avisar('herramientas', {estado: 'chequeando'});
  const r = await correr('cd ~/Editor-IA && bash scripts/verificar.sh >/dev/null 2>&1');
  if (r.code === 0) { avisar('herramientas', {estado: 'ok'}); return true; }
  avisar('herramientas', {estado: 'falta'}); return false;
}

async function pasoClaude() {
  avisar('claude', {estado: 'chequeando'});
  const r = await correr('claude auth status --json 2>/dev/null');
  if (/"loggedIn":\s*true/.test(r.salida)) { avisar('claude', {estado: 'ok', detalle: (/"email":\s*"([^"]+)"/.exec(r.salida) || [])[1]}); return true; }
  avisar('claude', {estado: 'falta'}); return false;
}

async function respondeEditor() { try { const r = await fetch(URL_EDITOR, {signal: AbortSignal.timeout(1500)}); return r.ok; } catch { return false; } }
async function pasoAbrir() {
  avisar('abrir', {estado: 'arrancando'});
  if (!(await respondeEditor())) {
    servidor = comando(`cd ~/Editor-IA/app && node scripts/deps.mjs && exec npx vite --port ${PUERTO} --strictPort --host 127.0.0.1`);
    servidor.stdout.on('data', () => {}); servidor.stderr.on('data', () => {});
  }
  for (let i = 0; i < 90; i++) {
    if (await respondeEditor()) { avisar('abrir', {estado: 'ok'}); ventana.loadURL(URL_EDITOR); return true; }
    await new Promise((r) => setTimeout(r, 1000));
  }
  avisar('abrir', {estado: 'error', detalle: 'El editor no arrancó en 90 s. Probá "Reintentar"; si sigue, abrí una terminal y corré bash ~/Editor-IA/scripts/verificar.sh'});
  return false;
}

async function iniciar() {
  ventana.loadFile(path.join(__dirname, 'inicio.html'));
  await new Promise((r) => ventana.webContents.once('did-finish-load', r));
  try {
    const token = await pasoGithub(); if (!token) return;
    if (!(await pasoWindows())) return;
    if (!(await pasoEditor(token))) return;
    if (!(await pasoHerramientas())) return;
    if (!(await pasoClaude())) return;
    await pasoAbrir();
  } catch (e) { avisar('error', {detalle: e.message}); }
}

function apagarServidor() {
  if (WIN && distro) spawn('wsl.exe', ['-d', distro, '--', 'bash', '-lc', `pkill -f "vite --port ${PUERTO}" || true`], {windowsHide: true});
  if (servidor && !WIN) { try { process.kill(-servidor.pid); } catch { /* ya terminó */ } }
  servidor = null;
}

// botones de la pantalla de inicio
ipcMain.handle('accion', async (_e, que) => {
  if (que === 'reintentar') return iniciar();
  if (que === 'instalar-wsl') {
    spawn('powershell.exe', ['-Command', "Start-Process wsl -ArgumentList '--install -d Ubuntu' -Verb RunAs"], {detached: true});
    return dialog.showMessageBox(ventana, {message: 'Se está preparando Windows (te pide permiso de administrador).', detail: 'Cuando termine, reiniciá la compu y volvé a abrir Editor IA.'});
  }
  if (que === 'crear-usuario') return spawn('cmd.exe', ['/c', 'start', '"Ubuntu"', 'wsl.exe', '-d', distro || 'Ubuntu'], {detached: true});
  if (que === 'instalar-git') return terminal(WIN ? 'sudo apt-get update && sudo apt-get install -y git' : 'xcode-select --install');
  if (que === 'instalar') return terminal(WIN ? 'bash ~/Editor-IA/instalar/linux.sh' : 'bash ~/Editor-IA/instalar/mac.sh');
  if (que === 'claude') return terminal('claude auth login');
  if (que === 'github') shell.openExternal(`https://github.com/${acceso.REPO}`);
  if (que === 'salir-github') { borrarToken(); apagarServidor(); return iniciar(); }
  return null;
});

function crearVentana() {
  ventana = new BrowserWindow({width: 1440, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#121110', title: 'Editor IA',
    icon: path.join(__dirname, 'build', 'icon.png'), webPreferences: {preload: path.join(__dirname, 'preload.js'), contextIsolation: true}});
  // los links externos (Drive, Notion, GitHub) se abren en el navegador, no adentro de la app
  ventana.webContents.setWindowOpenHandler(({url}) => { shell.openExternal(url); return {action: 'deny'}; });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{role: 'appMenu'}] : []),
    {label: 'Editor IA', submenu: [
      {label: 'Volver a chequear y actualizar', click: () => { apagarServidor(); iniciar(); }},
      {label: 'Cerrar sesión de GitHub', click: () => { borrarToken(); apagarServidor(); iniciar(); }},
      {type: 'separator'}, {role: 'reload', label: 'Recargar'}, {role: 'toggleDevTools', label: 'Herramientas de desarrollo'},
      {type: 'separator'}, {role: 'quit', label: 'Salir'}]},
    {role: 'editMenu', label: 'Edición'}, {role: 'viewMenu', label: 'Ver'}]));
  iniciar();
  // cada 30 min: si la quitaron del repo, se cierra el editor
  revision = setInterval(async () => {
    const t = leerToken(); if (!t) return;
    const r = await acceso.chequear(t, {ultimoOk: estado().ultimoOk || 0});
    if (r.estado === 'ok') guardarEstado({ultimoOk: Date.now()});
    if (['sin-acceso', 'token-invalido', 'sin-conexion'].includes(r.estado)) { apagarServidor(); if (r.estado === 'token-invalido') borrarToken(); iniciar(); }
  }, 30 * 60 * 1000);
}

app.whenReady().then(crearVentana);
app.on('window-all-closed', () => { clearInterval(revision); apagarServidor(); app.quit(); });
app.on('before-quit', apagarServidor);
