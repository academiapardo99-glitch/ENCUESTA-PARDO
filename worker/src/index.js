// ===== API pública del portal de estudiantes (Cloudflare Worker) =====
// Expone solo las rutas que necesita la encuesta y guarda cada respuesta en
// Supabase. El panel administrativo y el historial NO se publican aquí.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { guardarEncuestaSupabase, leerColeccion } from './supabase.js';
import { INSTRUMENTO_POR_DEFECTO, MODALIDADES, VALORES_ESCALA } from './catalogo.js';

const app = new Hono();
// CORS_ORIGIN (opcional) permite restringir quién puede llamar a la API desde
// el navegador; sin la variable se permite cualquier origen (comodín).
app.use('/api/*', cors({ origin: (origen, c) => c.env.CORS_ORIGIN || origen || '*' }));

const config = (env) => {
  const url = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (env.SUPABASE_KEY || '').trim();
  if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_KEY (wrangler secret put).');
  if (!/^https?:\/\//.test(url) || /\/rest\/v1/.test(url)) {
    throw new Error(`SUPABASE_URL no es válida ("${url}"). Debe ser https://TU-PROYECTO.supabase.co sin /rest/v1.`);
  }
  return { url, key };
};

// Devuelve el detalle del fallo de Supabase en JSON (el navegador lo muestra
// como "Error al enviar la encuesta") y lo deja en los logs de Cloudflare.
app.onError((err, c) => {
  console.error(`[api] ${err.message}`);
  return c.json({ error: err.message }, 500);
});

const nuevoId = () => crypto.randomUUID();

app.get('/api/salud', (c) => c.json({
  ok: true,
  servicio: 'encuesta-estudiantes',
  persistencia: 'supabase',
  supabaseConfigurado: Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_KEY),
  hora: new Date().toISOString(),
}));

// Catálogo depurado: sin correos ni historial.
app.get('/api/docentes', async (c) => {
  const docentes = await leerColeccion('docentes', config(c.env));
  return c.json(
    docentes
      .filter((d) => d.estado === 'activo')
      .map(({ id, nombre, cursoId, modalidadIds, estado }) => ({ id, nombre, cursoId, modalidadIds, estado }))
  );
});

app.get('/api/cursos', async (c) => {
  const cursos = await leerColeccion('cursos', config(c.env));
  return c.json(
    cursos
      .filter((x) => x.activo !== false)
      .map(({ id, nombre, grupoIds, activo }) => ({ id, nombre, grupoIds, activo }))
  );
});

app.get('/api/grupos', async (c) => {
  const grupos = await leerColeccion('grupos', config(c.env));
  return c.json(grupos.map(({ id, modalidadId, nombre, activo }) => ({ id, modalidadId, nombre, activo })));
});

app.get('/api/instrumento', (c) => c.json(INSTRUMENTO_POR_DEFECTO));

// Historial de solo lectura: el panel (Cloudflare Pages) puede usar este mismo
// Worker como API. Borrar/editar encuestas sigue fuera de alcance.
app.get('/api/encuestas', async (c) => {
  const filas = await leerColeccion('encuestas', config(c.env));
  const encuestas = filas
    .map((e) => ({
      ...e,
      docenteId: e.docenteId ?? e.docente_id ?? '',
      cursoId: e.cursoId ?? e.curso_id ?? '',
      modalidadId: e.modalidadId ?? e.modalidad_id ?? '',
      grupoId: e.grupoId ?? e.grupo_id ?? '',
      docenteNombre: e.docenteNombre ?? e.docente_nombre ?? '—',
      cursoNombre: e.cursoNombre ?? e.curso_nombre ?? '—',
      modalidadNombre: e.modalidadNombre ?? e.modalidad_nombre ?? '—',
      grupoNombre: e.grupoNombre ?? e.grupo_nombre ?? '—',
      creadoEn: e.creadoEn || e.creado_en || null,
    }))
    .sort((a, b) => String(b.creadoEn || '').localeCompare(String(a.creadoEn || '')));
  return c.json(encuestas);
});

// El panel administrativo usa estas rutas para listar el catálogo completo
// (incluye inactivos); el portal solo usa las de arriba.
app.get('/api/docentes/todos', async (c) => {
  return c.json(await leerColeccion('docentes', config(c.env)));
});

app.get('/api/cursos/todos', async (c) => {
  return c.json(await leerColeccion('cursos', config(c.env)));
});

app.post('/api/encuestas', async (c) => {
  const cuerpo = await c.req.json().catch(() => null);
  const { docenteId, cursoId, grupoId, modalidadId, respuestas } = cuerpo || {};
  if (!docenteId || !cursoId || !grupoId) {
    return c.json({ error: 'Faltan el docente, el curso o el grupo.' }, 400);
  }
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas) || !Object.keys(respuestas).length) {
    return c.json({ error: 'La encuesta no tiene respuestas.' }, 400);
  }

  const [docentes, cursos, grupos] = await Promise.all([
    leerColeccion('docentes', config(c.env)),
    leerColeccion('cursos', config(c.env)),
    leerColeccion('grupos', config(c.env)),
  ]);
  const docente = docentes.find((d) => d.id === docenteId);
  const curso = cursos.find((x) => x.id === cursoId);
  const grupo = grupos.find((g) => g.id === grupoId);
  if (!docente || !curso || !grupo) {
    return c.json({ error: 'El docente, el curso o el grupo indicado no existe.' }, 400);
  }

  // Valida igual que el backend: escala obligatoria 1..10 y comentarios libres.
  const valores = new Set(VALORES_ESCALA);
  const respuestasValidas = {};
  for (const pregunta of INSTRUMENTO_POR_DEFECTO.preguntas) {
    const valor = respuestas[pregunta.id];
    if (pregunta.tipo === 'texto') {
      if (valor == null || valor === '') continue;
      if (typeof valor !== 'string') return c.json({ error: `Respuesta de texto inválida en "${pregunta.texto}".` }, 400);
      respuestasValidas[pregunta.id] = valor.trim().slice(0, pregunta.maxLength || 500);
      continue;
    }
    if (pregunta.obligatoria && valor == null) {
      return c.json({ error: `Falta responder: "${pregunta.texto}".` }, 400);
    }
    if (!valores.has(valor)) {
      return c.json({ error: `Cada respuesta de escala debe estar entre 1 y 10.` }, 400);
    }
    respuestasValidas[pregunta.id] = valor;
  }

  const modalidad = MODALIDADES.find((m) => m.id === (modalidadId || grupo.modalidadId));
  const encuesta = {
    id: nuevoId(),
    docenteId,
    cursoId,
    modalidadId: modalidad?.id || '',
    grupoId,
    docenteNombre: docente.nombre || '—',
    cursoNombre: curso.nombre || '—',
    modalidadNombre: modalidad?.nombre || '—',
    grupoNombre: grupo.nombre || '—',
    respuestas: respuestasValidas,
    creadoEn: new Date().toISOString(),
  };

  await guardarEncuestaSupabase(encuesta, config(c.env));
  return c.json(encuesta, 201);
});

app.all('/api/*', (c) => c.json({ error: 'Ruta no encontrada.' }, 404));

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    // Las rutas API deben llegar a Hono antes del fallback SPA de los assets.
    if (url.pathname.startsWith('/api/')) return app.fetch(request, env);
    // El resto de las rutas (incluida la raíz) se sirve desde el build Vite.
    return env.ASSETS.fetch(request);
  },
};
