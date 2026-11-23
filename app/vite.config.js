import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {api, REPO} from './server/api.js';

// Un solo proceso: la interfaz (React + @remotion/player) y la API local que corre los scripts del repo.
export default defineConfig({
  plugins: [react(), {name: 'editor-api', configureServer: (server) => { server.middlewares.use(api()); }}],
  // la composición se importa de template/reel/src: que use el React y el Remotion de la app (uno solo de cada uno)
  resolve: {dedupe: ['react', 'react-dom', 'remotion']},
  server: {host: '127.0.0.1', port: 4321, strictPort: false, fs: {allow: [REPO]}},
  optimizeDeps: {include: ['react', 'react-dom', 'remotion', '@remotion/player']},
});
