// ===== Compilación para Cloudflare Pages =====
// Cloudflare Pages compila UN solo proyecto con UN solo directorio de salida.
// Este script compila los dos frontends de este monorepo:
//   - frontend/             → panel administrativo (raíz del sitio)
//   - frontend-estudiante/  → portal público en /estudiante/
// y deja todo en `dist-pages/`.
//
// Uso local:  node scripts/build-cloudflare-pages.mjs
// Uso en Pages:
//   Comando de compilación:  npm run build:cloudflare   (desde la raíz)
//   Directorio de salida:    dist-pages
//      o bien, sin root directory:
//   Comando de compilación:  node scripts/build-cloudflare-pages.mjs
//   Directorio de salida:    dist-pages
//
// Variables de solo LECTURA necesarias en la API (Microsoft Entra / Graph) se
// leen de VITE_*; se pueden definir como variables del proyecto en Pages. Las
// credenciales secretas (client_secret) NO se configuran aquí.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(raiz, 'dist-pages');

// Se invoca npm a través de Node para que no dependa de que npm esté en el
// PATH ni de npm.cmd en Windows.
const ejecutarNpm = (args, directorio, env = {}) => {
  console.log(`\n> npm ${args.join(' ')}  (${path.relative(raiz, directorio) || '.'})`);
  const npmCli = process.env.npm_execpath
    || [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')]
      .find((p) => fs.existsSync(p));
  const comando = npmCli ? process.execPath : 'npm';
  const argumentos = npmCli ? [npmCli, ...args] : args;
  return ejecutar(comando, argumentos, directorio, env);
};

const ejecutar = (comando, args, directorio, env = {}) => {
  console.log(`\n> ${comando} ${args.join(' ')}  (${path.relative(raiz, directorio) || '.'})`);
  const r = spawnSync(comando, args, {
    cwd: directorio,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (r.error || r.status !== 0) {
    console.error(`\n[ERROR] Falló: ${comando} ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
};

// El portal del estudiante se sirve bajo /estudiante/ en Pages.
const BASE_ESTUDIANTE = process.env.VITE_BASE_ESTUDIANTE || '/estudiante/';

console.log('1/2 Panel administrativo (frontend)');
ejecutarNpm(['ci', '--no-audit', '--no-fund'], path.join(raiz, 'frontend'));
ejecutarNpm(['run', 'build'], path.join(raiz, 'frontend'));

console.log(`\n2/2 Portal del estudiante (frontend-estudiante) — base ${BASE_ESTUDIANTE}`);
ejecutarNpm(['ci', '--no-audit', '--no-fund'], path.join(raiz, 'frontend-estudiante'));
ejecutarNpm(['run', 'build'], path.join(raiz, 'frontend-estudiante'), { VITE_BASE: BASE_ESTUDIANTE });

// ---------- Ensamblado de dist-pages ----------
fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(salida, { recursive: true });
fs.cpSync(path.join(raiz, 'frontend', 'dist'), salida, { recursive: true });
fs.cpSync(path.join(raiz, 'frontend-estudiante', 'dist'), path.join(salida, 'estudiante'), { recursive: true });

// SPA: cualquier ruta del panel (sin extensión y que no sea un asset) va a
// index.html. Las rutas /estudiante/* tienen su propio index.html.
fs.writeFileSync(
  path.join(salida, '_redirects'),
  [
    '# Portal del estudiante: SPA propia',
    '/estudiante/*  /estudiante/index.html  200',
    '# Panel administrativo: SPA',
    '/*  /index.html  200',
    '',
  ].join('\n'),
  'utf8'
);

// Un 404 real para archivos que no existen, para no servir HTML como JS.
fs.writeFileSync(
  path.join(salida, '_headers'),
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '',
  ].join('\n'),
  'utf8'
);

console.log(`\nListo: ${path.relative(raiz, salida)}/ (panel en /, portal en /estudiante/)`);
