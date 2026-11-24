// Antes de abrir la app: si falta alguna dependencia de package.json (por ejemplo, después de un git pull que sumó
// una), corre npm install solo. Así nadie ve "Failed to resolve import".
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8'));
const deps = {...pkg.dependencies, ...pkg.devDependencies};
const falta = Object.entries(deps).filter(([n, v]) => {
  try { return JSON.parse(fs.readFileSync(path.join(APP, 'node_modules', n, 'package.json'), 'utf8')).version !== v && /^\d/.test(v); }
  catch { return true; }
}).map(([n]) => n);
if (falta.length) {
  console.log(`Instalando lo que falta (${falta.join(', ')})…`);
  execSync('npm install --no-audit --no-fund', {cwd: APP, stdio: 'inherit'});
}
