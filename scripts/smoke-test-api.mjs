// Prueba rápida de humo de la API (útil para verificar el cambio de almacén).
// Uso:  node scripts/smoke-test-api.mjs [http://localhost:4000]
const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');

const pedir = async (ruta, opciones) => {
  const res = await fetch(`${BASE}${ruta}`, opciones);
  const texto = await res.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* no JSON */ }
  return { estado: res.status, datos };
};

const resultados = [];
const comprobar = (nombre, ok, detalle = '') => {
  resultados.push({ nombre, ok });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

const salud = await pedir('/api/salud');
comprobar('GET /api/salud', salud.estado === 200 && salud.datos?.ok === true, `${salud.estado}`);

const cursos = await pedir('/api/cursos');
comprobar('GET /api/cursos', cursos.estado === 200 && Array.isArray(cursos.datos), `${cursos.datos?.length ?? '?'} cursos`);

const docentes = await pedir('/api/docentes');
comprobar('GET /api/docentes', docentes.estado === 200 && Array.isArray(docentes.datos), `${docentes.datos?.length ?? '?'} docentes`);

const grupos = await pedir('/api/grupos');
comprobar('GET /api/grupos (20)', grupos.estado === 200 && grupos.datos?.length === 20, `${grupos.datos?.length ?? '?'} grupos`);

const encuestas = await pedir('/api/encuestas');
comprobar('GET /api/encuestas', encuestas.estado === 200 && Array.isArray(encuestas.datos), `${encuestas.datos?.length ?? '?'} encuestas`);

// Ciclo de escritura completo solo si hay catálogo (curso + grupo + docente).
const grupo = grupos.datos?.[0];
const curso = cursos.datos?.[0];
if (curso && grupo) {
  const creado = await pedir('/api/docentes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'DOCENTE PRUEBA SMOKE', cursoId: curso.id, modalidadIds: [grupo.modalidadId] }),
  });
  comprobar('POST /api/docentes', creado.estado === 201 && !!creado.datos?.id, `${creado.estado}`);

  if (creado.datos?.id) {
    const actualizado = await pedir(`/api/docentes/${creado.datos.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'DOCENTE PRUEBA SMOKE 2' }),
    });
    comprobar('PUT /api/docentes/:id', actualizado.estado === 200 && actualizado.datos?.nombre === 'DOCENTE PRUEBA SMOKE 2', `${actualizado.estado}`);

    const borrado = await pedir(`/api/docentes/${creado.datos.id}`, { method: 'DELETE' });
    comprobar('DELETE /api/docentes/:id', borrado.estado === 200 && borrado.datos?.ok === true, `${borrado.estado}`);
  }
}

const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} pruebas correctas.`);
process.exit(fallos.length ? 1 : 0);
