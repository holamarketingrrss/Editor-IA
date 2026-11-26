// Cliente de la API local (server/api.js)
const pedir = async (url, opts) => {
  const r = await fetch(url, opts);
  const x = await r.json().catch(() => ({error: `respuesta inválida (${r.status})`}));
  if (r.status === 401 && !url.startsWith('/api/sesion')) window.dispatchEvent(new Event('sin-sesion'));   // venció la sesión: vuelve al login
  if (!r.ok || x.error) throw new Error(x.error || `error ${r.status}`);
  return x;
};
const post = (url, body) => pedir(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});

export const api = {
  proyectos: () => pedir('/api/proyectos'),
  opciones: () => pedir('/api/opciones'),
  presets: () => pedir('/api/presets'),
  guardarPreset: (id) => post(`/api/p/${id}/guardar-preset`, {}),
  proyecto: (id) => pedir(`/api/p/${id}`),
  guardarGuion: (id, guion) => post(`/api/p/${id}/guion`, {guion}),
  guardarEdl: (id, edl) => post(`/api/p/${id}/edl`, {edl}),
  guardarProyecto: (id, cambios) => post(`/api/p/${id}/proyecto`, {cambios}),
  subir: (id, tipo, archivo) => pedir(`/api/p/${id}/subir?tipo=${tipo}&nombre=${encodeURIComponent(archivo.name)}`, {method: 'POST', body: archivo}),
  miniatura: (id, archivo, t) => `/api/p/${id}/miniatura?archivo=${encodeURIComponent(archivo)}&t=${(+t || 0).toFixed(1)}`,
  exportar: (id) => new EventSource(`/api/p/${id}/exportar`),
};

const borrar = (url) => pedir(url, {method: 'DELETE'});
export const sesionApi = {
  estado: () => pedir('/api/sesion'),
  entrar: (usuario, clave) => post('/api/sesion', {usuario, clave}),
  salir: () => borrar('/api/sesion'),
};
export const equipoApi = {
  ver: () => pedir('/api/equipo'),
  agregar: (m) => post('/api/equipo', m),
  cambiar: (id, cambios) => post(`/api/equipo/${encodeURIComponent(id)}`, cambios),
  quitar: (id) => borrar(`/api/equipo/${encodeURIComponent(id)}`),
  motor: (motor) => post('/api/equipo/motor', {motor}),
};

const enviarArchivo = (url, archivo) => pedir(url, {method: 'POST', body: archivo});
export const gestionApi = {
  borrarProyecto: (id) => borrar(`/api/p/${id}`),
  duplicar: (id, nuevo) => post(`/api/p/${id}/duplicar`, {nuevo}),
  renombrar: (id, nuevo) => post(`/api/p/${id}/renombrar`, {nuevo}),
  papelera: () => pedir('/api/papelera'),
  recuperar: (nombre) => post(`/api/papelera/${encodeURIComponent(nombre)}/recuperar`, {}),
  marca: (id) => pedir(`/api/marcas/${id}`),
  guardarMarca: (id, cambios) => post(`/api/marcas/${id}`, cambios),
  nuevaMarca: (nombre) => post('/api/marcas', {nombre}),
  borrarMarca: (id) => borrar(`/api/marcas/${id}`),
  subirMarca: (id, tipo, archivo) => enviarArchivo(`/api/marcas/${id}/archivo?tipo=${tipo}&nombre=${encodeURIComponent(archivo.name)}`, archivo),
  ajustes: () => pedir('/api/ajustes'),
  ajuste: (clave) => pedir(`/api/ajustes/${clave}`),
  guardarAjuste: (clave, texto) => post(`/api/ajustes/${clave}`, {texto}),
  ajusteOriginal: (clave) => post(`/api/ajustes/${clave}/original`, {}),
};

export const claudeApi = {
  estado: () => pedir('/api/claude/estado'),
  iniciar: (modo, p, texto, marca, modelo) => post('/api/claude/iniciar', {modo, p, texto, marca, modelo}),
  parar: () => post('/api/claude/parar', {}),
  eventos: () => new EventSource('/api/claude/eventos'),
};
