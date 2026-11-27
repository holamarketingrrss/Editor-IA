// Puente mínimo entre la pantalla de inicio y la app: recibe el avance de cada paso y manda los botones.
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('editor', {
  alPaso: (fn) => ipcRenderer.on('paso', (_e, d) => fn(d)),
  accion: (que) => ipcRenderer.invoke('accion', que),
});
