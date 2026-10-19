// ===== Servidor Express =====
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import docentesRouter from './rutas/docentes.js';
import cursosRouter from './rutas/cursos.js';
import encuestasRouter from './rutas/encuestas.js';
import instrumentoRouter from './rutas/instrumento.js';
import gruposRouter from './rutas/grupos.js';
import { listarDocentes } from './modelos/docentes.js';
import { listarCursos } from './modelos/cursos.js';
import { listarGrupos } from './modelos/grupos.js';
import { obtenerInstrumento } from './modelos/instrumento.js';
import { sembrarGrupos } from './modelos/grupos.js';
import { inicializarDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const PORTAL_ESTUDIANTE_PUBLICO = process.env.PORTAL_ESTUDIANTE_PUBLICO === 'true';

// Orígenes permitidos para el frontend en desarrollo.
const ORIGENES = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: ORIGENES.length ? ORIGENES : true }));
app.use(express.json({ limit: '1mb' }));

// Traza mínima de peticiones (útil en desarrollo).
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - inicio}ms)`);
    }
  });
  next();
});

app.get('/api/salud', (req, res) => {
  res.json({ ok: true, servicio: 'encuestas-api', hora: new Date().toISOString() });
});

if (PORTAL_ESTUDIANTE_PUBLICO) {
  // Catálogo mínimo para el formulario. No exponer correos, detalles internos,
  // modificaciones administrativas ni el historial de respuestas.
  app.get('/api/docentes', (req, res) => {
    res.json(listarDocentes()
      .filter((d) => d.estado === 'activo')
      .map(({ id, nombre, cursoId, modalidadIds, estado }) => ({ id, nombre, cursoId, modalidadIds, estado })));
  });
  app.get('/api/cursos', (req, res) => {
    res.json(listarCursos()
      .filter((c) => c.activo !== false)
      .map(({ id, nombre, grupoIds, activo }) => ({ id, nombre, grupoIds, activo })));
  });
  app.get('/api/grupos', async (req, res, next) => {
    try {
      res.json((await listarGrupos()).map(({ id, modalidadId, nombre, activo }) => ({ id, modalidadId, nombre, activo })));
    } catch (error) {
      next(error);
    }
  });
  app.get('/api/instrumento', (req, res) => res.json(obtenerInstrumento()));
  app.use('/api/encuestas', (req, res, next) => {
    if (req.method === 'POST' && req.path === '/') return next();
    return res.status(404).json({ error: 'Ruta no disponible en el portal público.' });
  }, encuestasRouter);
} else {
  app.use('/api/docentes', docentesRouter);
  app.use('/api/cursos', cursosRouter);
  app.use('/api/encuestas', encuestasRouter);
  app.use('/api/instrumento', instrumentoRouter);
  app.use('/api/grupos', gruposRouter);
}
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Servir el frontend compilado si existe (despliegue de un solo proceso).
const ESTUDIANTE_DIST = path.join(__dirname, '..', '..', 'frontend-estudiante', 'dist');
const DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (PORTAL_ESTUDIANTE_PUBLICO) {
  app.use(express.static(ESTUDIANTE_DIST));
  app.get(/^\/(?!api).*/, (req, res, next) => {
    res.sendFile(path.join(ESTUDIANTE_DIST, 'index.html'), (err) => {
      if (err) next();
    });
  });
} else {
  app.use('/estudiante', express.static(ESTUDIANTE_DIST));
  app.get(/^\/estudiante(?:\/.*)?$/, (req, res, next) => {
    res.sendFile(path.join(ESTUDIANTE_DIST, 'index.html'), (err) => {
      if (err) next();
    });
  });
  app.use(express.static(DIST));
  app.get(/^\/(?!api).*/, (req, res, next) => {
    res.sendFile(path.join(DIST, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

// Manejo de errores centralizado.
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// Arranque: carga el almacén (JSON local o Supabase) y siembra los grupos
// (idempotente: siempre 20 = 5 modalidades × A–D).
try {
  await inicializarDb();
  await sembrarGrupos();
} catch (error) {
  console.error('\n[ERROR] No se pudo inicializar la base de datos:', error.message, '\n');
  process.exit(1);
}

const servidor = app.listen(PORT, () => {
  console.log(`API de encuestas escuchando en http://localhost:${PORT}`);
});

// Mensaje claro si el puerto ya está ocupado (otra instancia del backend, un
// reinicio de nodemon/--watch, etc.) en lugar del volcado de "Unhandled 'error'".
servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n[ERROR] El puerto ${PORT} ya está en uso.\n` +
      `Hay otra instancia del backend corriendo o quedó un proceso anterior sin cerrar.\n` +
      `Cierra esa instancia o cambia el puerto:  $env:PORT=4001; npm run dev\n`
    );
    process.exit(1);
  }
  console.error('Error del servidor:', err);
  process.exit(1);
});
