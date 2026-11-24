import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {api, REPO} from './server/api.js';
import {activo, CONFIG} from './server/equipo.js';

// Un solo proceso: la interfaz (React + @remotion/player) y la API local que corre los scripts del repo.
// `npm run editor`: solo esta compu (127.0.0.1). `npm run equipo`: abierta a la red, y solo con equipo configurado
// (usuarios y claves en ~/.editor-ia/equipo.json: ver app/EQUIPO.md).
const enRed = (h) => h === true || (typeof h === 'string' && !['127.0.0.1', 'localhost', '::1'].includes(h));
export default defineConfig({
  plugins: [react(), {
    name: 'editor-api',
    configureServer: (server) => {
      if (enRed(server.config.server.host) && !activo()) {
        throw new Error(`Para abrir el editor a la red primero creá el equipo (usuarios con clave): node scripts/equipo.mjs agregar <nombre> --admin\n(config en ${CONFIG})`);
      }
      server.middlewares.use(api());
    },
  }],
  // la composición se importa de template/reel/src: que use el React y el Remotion de la app (uno solo de cada uno)
  resolve: {dedupe: ['react', 'react-dom', 'remotion']},
  // allowedHosts: nombres con los que se entra desde otra compu (IP y localhost ya valen; .ts.net = Tailscale; más con EDITOR_HOSTS)
  server: {host: '127.0.0.1', port: 4321, strictPort: false, fs: {allow: [REPO]},
    allowedHosts: ['.ts.net', ...(process.env.EDITOR_HOSTS || '').split(',').map((x) => x.trim()).filter(Boolean)]},
  optimizeDeps: {include: ['react', 'react-dom', 'remotion', '@remotion/player']},
});
