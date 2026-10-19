// ===== API pública del portal de estudiantes (Cloudflare Worker) =====
// Expone solo las rutas que necesita la encuesta y guarda cada respuesta en
// Supabase. El panel administrativo y el historial NO se publican aquí.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { guardarEncuestaSupabase, leerColeccion } from './supabase.js';
import { INSTRUMENTO_POR_DEFECTO, MODALIDADES, VALORES_ESCALA } from './catalogo.js';

const app = new Hono();
app.use('/api/*', cors());

const config = (env) => {
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_KEY || '';
  if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_KEY (wrangler secret put).');
  return { url, key };
};

const nuevoId = () => crypto.randomUUID();

app.get('/api/salud', (c) => c.json({ ok: true, servicio: 'encuesta-estudiantes', hora: new Date().toISOString() }));

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

app.get('/api/encuestas', (c) => c.json({ error: 'Ruta no disponible en el portal público.' }, 404));

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
