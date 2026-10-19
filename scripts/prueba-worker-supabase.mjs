// Prueba del Worker de Cloudflare contra un PostgREST simulado, sin red.
// Arranca un servidor que imita Supabase (GET/POST sobre /rest/v1/*), levanta
// el Worker con wrangler dev y comprueba salud, catálogo y alta de encuesta.
//
// Uso:  node scripts/prueba-worker-supabase.mjs
// Requiere: portal compilado (npm --prefix frontend-estudiante run build) y
//           dependencias del Worker instaladas.
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO_SUPABASE = 8799;
const PUERTO_WORKER = 8798;

// ---------- PostgREST simulado ----------
const tablas = {
  cursos: [{ id: 'c1', nombre: 'Matemática', grupoIds: ['g-colegio-a'], activo: true }],
  docentes: [{ id: 'd1', nombre: 'Ana Pérez', cursoId: 'c1', modalidadIds: ['colegio'], estado: 'activo' }],
  grupos: [{ id: 'g-colegio-a', modalidadId: 'colegio', nombre: 'A', activo: true }],
  encuestas: [],
};

const falso = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const tabla = url.pathname.replace('/rest/v1/', '');
  if (!tablas[tabla]) return res.writeHead(404).end('{"message":"tabla inexistente"}');
  const enviar = (estado, cuerpo) => res.writeHead(estado, { 'Content-Type': 'application/json' }).end(JSON.stringify(cuerpo ?? null));
  if (req.method === 'GET') return enviar(200, tablas[tabla]);
  const partes = [];
  req.on('data', (c) => partes.push(c));
  req.on('end', () => {
    if (req.method === 'POST') {
      const fila = JSON.parse(Buffer.concat(partes).toString() || '{}');
      tablas[tabla].push(fila);
      return enviar(201, null);
    }
    enviar(405, { message: 'método no permitido' });
  });
});

await new Promise((ok) => falso.listen(PUERTO_SUPABASE, ok));

const worker = spawn(process.execPath, [
  path.join(raiz, 'worker', 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  'dev', '--config', path.join(raiz, 'worker', 'wrangler.jsonc'),
  '--port', String(PUERTO_WORKER), '--local',
  '--var', `SUPABASE_URL:http://127.0.0.1:${PUERTO_SUPABASE}`,
  '--var', 'SUPABASE_KEY:clave-de-prueba',
], { cwd: raiz, stdio: ['ignore', 'pipe', 'pipe'] });

let log = '';
worker.stdout.on('data', (d) => { log += d; });
worker.stderr.on('data', (d) => { log += d; });

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
for (let i = 0; i < 60 && !/Ready on/.test(log); i += 1) await esperar(500);

const pedir = async (ruta, opciones) => {
  const res = await fetch(`http://127.0.0.1:${PUERTO_WORKER}${ruta}`, opciones);
  const texto = await res.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* HTML */ }
  return { estado: res.status, tipo: res.headers.get('content-type') || '', datos };
};

const resultados = [];
const comprobar = (nombre, ok, detalle = '') => {
  resultados.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

try {
  let r = await pedir('/api/salud');
  comprobar('GET /api/salud', r.estado === 200 && r.datos?.ok === true && r.datos?.supabaseConfigurado === true, `${r.estado}`);

  r = await pedir('/api/docentes');
  comprobar('GET /api/docentes lee de Supabase', r.estado === 200 && r.datos?.length === 1 && r.datos[0].nombre === 'Ana Pérez', `${r.datos?.length ?? '?'} docentes`);

  r = await pedir('/api/cursos');
  comprobar('GET /api/cursos lee de Supabase', r.estado === 200 && r.datos?.[0]?.id === 'c1', `${r.datos?.length ?? '?'} cursos`);

  r = await pedir('/api/grupos');
  comprobar('GET /api/grupos lee de Supabase', r.estado === 200 && r.datos?.[0]?.id === 'g-colegio-a', `${r.datos?.length ?? '?'} grupos`);

  const respuestas = {};
  for (const seccion of ['dominio-tema', 'desarrollo-ejercicios', 'preparacion-admision', 'desarrollo-clases', 'responsabilidad-puntualidad', 'trato-alumnos']) {
    for (let i = 1; i <= 4; i += 1) respuestas[`${seccion}-${i}`] = 9;
  }
  r = await pedir('/api/encuestas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docenteId: 'd1', cursoId: 'c1', grupoId: 'g-colegio-a', modalidadId: 'colegio', respuestas }),
  });
  const fila = tablas.encuestas[0];
  comprobar(
    'POST /api/encuestas guarda columnas camelCase en Supabase',
    r.estado === 201 && tablas.encuestas.length === 1 && fila.docenteId === 'd1' && !!fila.creadoEn && fila.docenteNombre === 'Ana Pérez',
    `${r.estado}`
  );

  // La SPA debe servirse en la raíz y en rutas profundas.
  r = await pedir('/');
  comprobar('GET / sirve el portal compilado', r.estado === 200 && r.tipo.includes('text/html'), `${r.estado}`);
  r = await pedir('/cualquier/ruta');
  comprobar('Ruta SPA desconocida devuelve index.html', r.estado === 200 && r.tipo.includes('text/html'), `${r.estado}`);

  r = await pedir('/api/encuestas');
  comprobar('GET /api/encuestas devuelve el historial con creadoEn', r.estado === 200 && r.datos?.[0]?.docenteNombre === 'Ana Pérez' && !!r.datos[0].creadoEn, `${r.estado}`);

  r = await pedir('/api/docentes/todos');
  comprobar('GET /api/docentes/todos sirve al panel', r.estado === 200 && r.datos?.[0]?.id === 'd1', `${r.estado}`);

  // Fail-closed: registrar una encuesta exige docente/curso/grupo existentes.
  r = await pedir('/api/encuestas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docenteId: 'no-existe', cursoId: 'c1', grupoId: 'g-colegio-a', respuestas }),
  });
  comprobar('POST /api/encuestas rechaza docente inexistente', r.estado === 400, `${r.estado}`);
} finally {
  worker.kill();
  falso.close();
}

const fallos = resultados.filter((ok) => !ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} pruebas correctas.`);
if (fallos) console.log(log.split('\n').slice(-15).join('\n'));
process.exit(fallos ? 1 : 0);
