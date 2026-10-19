// Prueba del modo PERSISTENCIA=supabase sin conexión real a Supabase.
// Levanta un servidor HTTP que imita PostgREST (select, upsert y delete) y un
// backend del proyecto apuntando a él. Uso: node scripts/prueba-supabase-simulado.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- PostgREST falso ----------
const tablas = {
  cursos: [],
  docentes: [],
  grupos: [],
  encuestas: [],
};

const falso = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const tabla = url.pathname.split('/').pop();
  if (!tablas[tabla]) { res.writeHead(404).end('[]'); return; }
  const cuerpo = [];
  req.on('data', (c) => cuerpo.push(c));
  req.on('end', () => {
    if (req.method === 'GET') {
      const select = url.searchParams.get('select') || '*';
      const filas = select === '*' ? tablas[tabla] : tablas[tabla].map((f) => ({ [select]: f[select] }));
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(filas));
      return;
    }
    if (req.method === 'POST') {
      const filas = JSON.parse(Buffer.concat(cuerpo).toString() || '[]');
      for (const fila of filas) {
        const clave = tabla === 'encuestas' ? 'id' : 'id';
        const i = tablas[tabla].findIndex((f) => f[clave] === fila[clave]);
        if (i === -1) tablas[tabla].push(fila);
        else tablas[tabla][i] = { ...tablas[tabla][i], ...fila };
      }
      res.writeHead(201, { 'Content-Type': 'application/json' }).end('[]');
      return;
    }
    if (req.method === 'DELETE') {
      const or = url.searchParams.get('or') || '';
      const valores = [...or.matchAll(/(\w+)=eq\.([^,)]+)/g)].map((m) => decodeURIComponent(m[2]));
      tablas[tabla] = tablas[tabla].filter((f) => !valores.includes(String(f.id)));
      res.writeHead(204).end();
      return;
    }
    res.writeHead(405).end();
  });
});

await new Promise((ok) => falso.listen(4599, ok));

const api = spawn(process.execPath, ['src/server.js'], {
  cwd: path.join(raiz, 'backend'),
  env: {
    ...process.env,
    PORT: '4598',
    PERSISTENCIA: 'supabase',
    SUPABASE_URL: 'http://127.0.0.1:4599',
    SUPABASE_SERVICE_ROLE_KEY: 'clave-de-prueba',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let salida = '';
api.stdout.on('data', (d) => { salida += d; });
api.stderr.on('data', (d) => { salida += d; });

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
let estadio = 0;
while (!salida.includes('escuchando') && !salida.includes('ERROR') && estadio < 40) {
  await esperar(250);
  estadio += 1;
}
console.log(salida.trim());

const pedir = async (ruta, opciones) => {
  const res = await fetch(`http://127.0.0.1:4598${ruta}`, opciones);
  return { estado: res.status, datos: await res.json().catch(() => null) };
};

const resultados = [];
const comprobar = (nombre, ok, detalle = '') => {
  resultados.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

try {
  let r = await pedir('/api/grupos');
  comprobar('Arranque siembra 20 grupos en Supabase', r.estado === 200 && r.datos.length === 20 && tablas.grupos.length === 20, `${tablas.grupos.length} filas`);

  r = await pedir('/api/cursos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Matemática', grupoIds: [tablas.grupos[0].id] }),
  });
  comprobar('POST /api/cursos', r.estado === 201, `${r.estado}`);
  const cursoId = r.datos?.id;

  r = await pedir('/api/docentes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Docente Supabase', cursoId, modalidadIds: ['colegio'] }),
  });
  comprobar('POST /api/docentes', r.estado === 201 && tablas.docentes.length === 1, `${r.estado}`);
  const docenteId = r.datos?.id;

  r = await pedir('/api/docentes');
  comprobar('GET /api/docentes lee del almacén', r.datos?.length === 1 && r.datos[0].nombre === 'Docente Supabase');

  r = await pedir(`/api/docentes/${docenteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Docente Editado' }),
  });
  comprobar('PUT /api/docentes/:id', r.estado === 200 && tablas.docentes[0].nombre === 'Docente Editado');

  r = await pedir(`/api/grupos/${tablas.grupos[0].id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo: false }),
  });
  comprobar('PATCH /api/grupos/:id', r.estado === 200 && tablas.grupos[0].activo === false, `${r.estado}`);

  const respuestas = {};
  for (const seccion of ['dominio-tema', 'desarrollo-ejercicios', 'preparacion-admision', 'desarrollo-clases', 'responsabilidad-puntualidad', 'trato-alumnos']) {
    for (let i = 1; i <= 4; i += 1) respuestas[`${seccion}-${i}`] = 9;
  }
  r = await pedir('/api/encuestas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docenteId, cursoId, grupoId: tablas.grupos[0].id, modalidadId: 'colegio', respuestas }),
  });
  comprobar('POST /api/encuestas guarda con creado_en', r.estado === 201 && tablas.encuestas.length === 1 && !!tablas.encuestas[0].creado_en, `${r.estado}`);

  r = await pedir('/api/encuestas');
  comprobar('GET /api/encuestas devuelve creadoEn', r.datos?.length === 1 && !!r.datos[0].creadoEn, `${r.datos?.[0]?.docenteNombre}`);

  r = await pedir(`/api/cursos/${cursoId}`, { method: 'DELETE' });
  comprobar('DELETE /api/cursos/:id', r.estado === 200 && tablas.cursos.length === 0);
  comprobar(
    'Los docentes del curso eliminado quedan desactivados',
    !!tablas.docentes[0] && tablas.docentes[0].cursoId === '' && tablas.docentes[0].estado === 'inactivo'
  );
} finally {
  api.kill();
  falso.close();
}

const fallos = resultados.filter((ok) => !ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} pruebas correctas.`);
process.exit(fallos ? 1 : 0);
