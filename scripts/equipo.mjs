#!/usr/bin/env node
// Administra quién usa el editor (lo mismo que la pantalla Equipo de la app, para la primera vez o sin la app).
// La configuración queda en ~/.editor-ia/ (o EDITOR_CONFIG), fuera del repo.
//   node scripts/equipo.mjs lista
//   node scripts/equipo.mjs agregar "Nombre Apellido" [--usuario juli] [--email x@y] [--admin] [--limite 20]   (pide la clave)
//   node scripts/equipo.mjs clave <usuario>            (pide la clave nueva)
//   node scripts/equipo.mjs desactivar|activar|quitar <usuario>
//   node scripts/equipo.mjs limite <usuario> <usd|no>  límite mensual de Claude por persona
//   node scripts/equipo.mjs motor cuenta|api           con qué paga Claude (ver app/EQUIPO.md)
//   node scripts/equipo.mjs uso                        uso del mes por persona
import readline from 'node:readline';
import * as eq from '../app/server/equipo.js';

const [cmd, ...resto] = process.argv.slice(2);
const flag = (n) => { const i = resto.indexOf(n); return i >= 0 ? (resto[i + 1] && !resto[i + 1].startsWith('--') ? resto.splice(i, 2)[1] : (resto.splice(i, 1), true)) : null; };

function pedirClave(texto) {
  if (process.env.EDITOR_CLAVE) return Promise.resolve(process.env.EDITOR_CLAVE);   // para pruebas automáticas
  return new Promise((ok) => {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout, terminal: true});
    rl._writeToOutput = (s) => { if (s.includes(texto)) rl.output.write(s); };   // no muestra lo que se tipea
    rl.question(texto, (c) => { rl.close(); process.stdout.write('\n'); ok(c); });
  });
}

// acepta el usuario o el nombre completo, sin importar mayúsculas: "hola", "Hola" o "Hola Marketing"
const quien = (texto) => {
  const t = String(texto || '').trim().toLowerCase();
  const ms = eq.leerEquipo()?.miembros || [];
  const m = ms.find((x) => x.id === t) || ms.find((x) => x.nombre.toLowerCase() === t);
  if (!m) throw new Error(`no existe "${texto}". Usuarios: ${ms.map((x) => `${x.id} (${x.nombre})`).join(', ') || 'ninguno'}`);
  return m.id;
};

const tabla = () => {
  const e = eq.leerEquipo();
  if (!e) return console.log(`Sin equipo: la app funciona sola en esta compu, sin login. Config: ${eq.CONFIG}`);
  const uso = eq.usoDelMes();
  console.log(`Motor: ${e.motor}   Config: ${eq.CONFIG}\n  USUARIO          ROL     NOMBRE`);
  for (const m of e.miembros) {
    const u = uso[m.id] || {costo: 0, pedidos: 0, cambios: 0};
    console.log(`${m.activo ? ' ' : '✗'} ${m.id.padEnd(16)} ${m.rol.padEnd(7)} ${m.nombre.padEnd(24)} mes: ${u.pedidos} pedidos, ${u.cambios} cambios, US$ ${u.costo.toFixed(2)}${m.limiteUsd != null ? ` / límite ${m.limiteUsd}` : ''}`);
  }
};

try {
  if (!cmd || cmd === 'lista') tabla();
  else if (cmd === 'agregar') {
    const admin = flag('--admin'), usuario = flag('--usuario'), email = flag('--email'), limite = flag('--limite');
    const nombre = resto.join(' ').trim();
    if (!nombre) throw new Error('uso: agregar "Nombre" [--usuario x] [--admin]');
    const c1 = await pedirClave(`Clave para ${nombre} (6+ caracteres): `);
    if (!process.env.EDITOR_CLAVE && c1 !== await pedirClave('Repetila: ')) throw new Error('las claves no coinciden');
    const m = eq.agregar({id: usuario || nombre.split(' ')[0], nombre, email: email || '', rol: admin ? 'admin' : 'editor', clave: c1, limiteUsd: limite ? +limite : null});
    console.log(`Listo: ${m.nombre} entra como "${m.id}" (${m.rol}).`);
  } else if (cmd === 'clave') {
    const id = quien(resto.join(' '));
    const c1 = await pedirClave(`Clave nueva para ${id} (6+ caracteres): `);
    if (!process.env.EDITOR_CLAVE && c1 !== await pedirClave('Repetila: ')) throw new Error('las claves no coinciden');
    eq.cambiar(id, {clave: c1}); console.log(`Clave cambiada. Entrá con el usuario "${id}".`);
  } else if (cmd === 'activar' || cmd === 'desactivar') {
    const id = quien(resto.join(' '));
    eq.cambiar(id, {activo: cmd === 'activar'}); console.log(`${id}: ${cmd === 'activar' ? 'activo' : 'desactivado (se cierra su sesión)'}.`);
  } else if (cmd === 'quitar') { const id = quien(resto.join(' ')); eq.quitar(id); console.log(`${id}: quitado.`); }
  else if (cmd === 'limite') { const v = resto.pop(); eq.cambiar(quien(resto.join(' ')), {limiteUsd: v === 'no' ? null : +v}); tabla(); }
  else if (cmd === 'motor') { eq.motor(resto[0]); console.log(`Motor: ${resto[0]}.`); }
  else if (cmd === 'uso') tabla();
  else throw new Error(`comando desconocido: ${cmd}`);
} catch (e) { console.error('Error:', e.message); process.exit(1); }
