// Cliente de la API local (server/api.js)
const pedir = async (url, opts) => {
  const r = await fetch(url, opts);
  const x = await r.json().catch(() => ({error: `respuesta inválida (${r.status})`}));
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

export const claudeApi = {
  estado: () => pedir('/api/claude/estado'),
  iniciar: (modo, p, texto, marca) => post('/api/claude/iniciar', {modo, p, texto, marca}),
  parar: () => post('/api/claude/parar', {}),
  eventos: () => new EventSource('/api/claude/eventos'),
};
