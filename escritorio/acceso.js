// Acceso al Editor IA con GitHub (sin servidor propio y gratis): la persona entra con su cuenta de GitHub (device flow,
// en el navegador) y la app chequea, cada vez que abre y cada 30 min, que siga siendo colaboradora del repo. Quitarla de
// GitHub › repo › Settings › Collaborators la deja afuera. Sin conexión, vale el último chequeo bueno por 7 días.
const CLIENT_ID = 'Ov23liMqQHKI3gasEJDS';          // OAuth App "Editor IA" de holamarketingrrss (público, no es secreto)
const REPO = 'holamarketingrrss/Editor-IA';
const GRACIA_SIN_CONEXION = 7 * 24 * 3600 * 1000;

const json = async (r) => { try { return await r.json(); } catch { return {}; } };

// 1) pide un código: la persona lo escribe en github.com/login/device
async function pedirCodigo(fetchFn = fetch) {
  const r = await fetchFn('https://github.com/login/device/code', {method: 'POST', headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
    body: JSON.stringify({client_id: CLIENT_ID, scope: 'repo'})});
  const d = await json(r);
  if (!d.device_code) throw new Error(d.error_description || 'GitHub no respondió el código de acceso');
  return d;   // {device_code, user_code, verification_uri, interval, expires_in}
}

// 2) espera a que la persona autorice; devuelve el token
async function esperarToken(codigo, {fetchFn = fetch, dormir = (ms) => new Promise((r) => setTimeout(r, ms)), cancelado = () => false} = {}) {
  let intervalo = (codigo.interval || 5) * 1000;
  const vence = Date.now() + (codigo.expires_in || 900) * 1000;
  while (Date.now() < vence && !cancelado()) {
    await dormir(intervalo);
    const r = await fetchFn('https://github.com/login/oauth/access_token', {method: 'POST', headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
      body: JSON.stringify({client_id: CLIENT_ID, device_code: codigo.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code'})});
    const d = await json(r);
    if (d.access_token) return d.access_token;
    if (d.error === 'slow_down') intervalo += 5000;
    else if (d.error === 'access_denied') throw new Error('Cancelaste la autorización en GitHub.');
    else if (d.error === 'expired_token') break;
    else if (d.error && d.error !== 'authorization_pending') throw new Error(d.error_description || d.error);
  }
  throw new Error('El código venció. Volvé a intentar.');
}

// 3) ¿sigue teniendo acceso? {estado: 'ok'|'sin-acceso'|'token-invalido'|'sin-conexion', usuario}
async function chequear(token, {fetchFn = fetch, ultimoOk = 0, ahora = Date.now()} = {}) {
  const h = {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Editor-IA'};
  try {
    const u = await fetchFn('https://api.github.com/user', {headers: h});
    if (u.status === 401) return {estado: 'token-invalido'};
    const usuario = (await json(u)).login;
    const r = await fetchFn(`https://api.github.com/repos/${REPO}`, {headers: h});
    if (r.status === 200) return {estado: 'ok', usuario};
    if (r.status === 401) return {estado: 'token-invalido'};
    return {estado: 'sin-acceso', usuario};
  } catch {
    return ahora - ultimoOk < GRACIA_SIN_CONEXION ? {estado: 'sin-conexion-ok'} : {estado: 'sin-conexion'};
  }
}

module.exports = {CLIENT_ID, REPO, pedirCodigo, esperarToken, chequear, GRACIA_SIN_CONEXION};
