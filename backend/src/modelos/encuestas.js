// ===== Encuestas =====
// Cada encuesta congela los nombres de docente/curso/modalidad/grupo en el
// momento de responder, de modo que el historial no cambia si luego se edita
// el catálogo.
import { db, escribir, leer, nuevoId, USAR_SUPABASE } from '../db.js';
import { MODALIDADES } from '../catalogo.js';
import { listarGrupos } from './grupos.js';
import { listarDocentes } from './docentes.js';
import { listarCursos } from './cursos.js';

// La tabla `encuestas` usa `id` como clave primaria y las mismas columnas
// camelCase que los modelos (`creadoEn`, `docenteId`, ...). El Worker público y
// este backend escriben por tanto en las MISMAS columnas, así que las encuestas
// del portal aparecen en el panel administrativo. Las columnas snake_case del
// esquema quedan como respaldo para registros antiguos.
function normalizarEncuesta(e) {
  const creadoEn = e.creadoEn || e.creado_en || null;
  const base = { ...e };
  delete base.creado_en;
  return {
    ...base,
    docenteId: e.docenteId ?? e.docente_id ?? '',
    cursoId: e.cursoId ?? e.curso_id ?? '',
    modalidadId: e.modalidadId ?? e.modalidad_id ?? '',
    grupoId: e.grupoId ?? e.grupo_id ?? '',
    docenteNombre: e.docenteNombre ?? e.docente_nombre ?? '—',
    cursoNombre: e.cursoNombre ?? e.curso_nombre ?? '—',
    modalidadNombre: e.modalidadNombre ?? e.modalidad_nombre ?? '—',
    grupoNombre: e.grupoNombre ?? e.grupo_nombre ?? '—',
    creadoEn,
    // `id` es la clave primaria (text). Los registros antiguos sin id se
    // identifican por la fecha de creación para no romper el panel.
    id: e.id || creadoEn || '',
  };
}

// En Supabase se inserta solo con las columnas del esquema (sin claves extra);
// en local se conserva el objeto tal cual.
function filaEncuesta(e) {
  if (!USAR_SUPABASE) return e;
  return {
    id: e.id,
    docenteId: e.docenteId,
    cursoId: e.cursoId,
    modalidadId: e.modalidadId,
    grupoId: e.grupoId,
    docenteNombre: e.docenteNombre,
    cursoNombre: e.cursoNombre,
    modalidadNombre: e.modalidadNombre,
    grupoNombre: e.grupoNombre,
    respuestas: e.respuestas,
    creadoEn: e.creadoEn || new Date().toISOString(),
  };
}

export function listarEncuestas() {
  return leer('encuestas')
    .map(normalizarEncuesta)
    .sort((a, b) => String(b.creadoEn || '').localeCompare(String(a.creadoEn || '')));
}

export async function crearEncuesta(payload) {
  const docente = listarDocentes().find((d) => d.id === payload.docenteId);
  const curso = listarCursos().find((c) => c.id === payload.cursoId);
  const grupo = listarGrupos().find((g) => g.id === payload.grupoId);
  const modalidad = MODALIDADES.find((m) => m.id === payload.modalidadId);

  const encuesta = {
    id: nuevoId(),
    docenteId: payload.docenteId,
    cursoId: payload.cursoId,
    modalidadId: payload.modalidadId || grupo?.modalidadId || '',
    grupoId: payload.grupoId || '',
    // Datos congelados (histórico inmutable)
    docenteNombre: docente?.nombre || '—',
    cursoNombre: curso?.nombre || '—',
    modalidadNombre: modalidad?.nombre || '—',
    grupoNombre: grupo?.nombre || '—',
    respuestas: { ...(payload.respuestas || {}) }, // { [preguntaId]: 1..10 }
    creadoEn: new Date().toISOString(),
  };
  await escribir('encuestas', (previas) => [...previas, encuesta], (items) => items.map(filaEncuesta));
  return encuesta;
}

export async function eliminarEncuesta(id) {
  let eliminada = false;
  await escribir(
    'encuestas',
    (previas) => {
      eliminada = previas.some((e) => e.id === id);
      return previas.filter((e) => e.id !== id);
    },
    (items) => items.map(filaEncuesta)
  );
  return eliminada;
}
