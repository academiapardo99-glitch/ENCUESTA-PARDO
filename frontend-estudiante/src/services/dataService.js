// ===== Servicios de datos =====
// Misma interfaz asíncrona que usaba la versión con localStorage, pero ahora
// respaldada por la API REST. El resto de la aplicación no necesita cambios.
import { http } from '../api/cliente.js';

// ---------- Catálogo académico ----------
// Cada modalidad agrupa a los alumnos en los grupos fijos A, B, C y D.
export const MODALIDADES = [
  { id: 'colegio', nombre: 'Colegio', icono: 'escuela', descripcion: 'Alumnos que provienen del nivel secundario' },
  { id: 'primera', nombre: 'Primera Opción', icono: 'estrella', descripcion: 'Postulantes que eligen esta carrera como primera opción' },
  { id: 'primera-avanzado', nombre: 'Primera Opción Avanzado', icono: 'tendencia', descripcion: 'Postulantes de Primera Opción con preparación avanzada' },
  { id: 'ordinario', nombre: 'Ordinario', icono: 'universidad', descripcion: 'Admisión en el examen ordinario' },
  { id: 'cepu', nombre: 'Ordinario Cepru', icono: 'verificado', descripcion: 'Centro de Estudios Preuniversitarios' },
];

// Todos los grados de cada modalidad se dividen siempre en estos 4 grupos.
export const GRUPOS_BASE = ['A', 'B', 'C', 'D'];

// ---------- Docentes ----------
export const docentesService = {
  listar: () => http.get('/docentes'),
  crear: (datos) => http.post('/docentes', datos),
  actualizar: (id, cambios) => http.put(`/docentes/${id}`, cambios),
  eliminar: (id) => http.delete(`/docentes/${id}`),
};

// ---------- Cursos ----------
export const cursosService = {
  listar: () => http.get('/cursos'),
  crear: (datos) => http.post('/cursos', datos),
  actualizar: (id, cambios) => http.put(`/cursos/${id}`, cambios),
  eliminar: (id) => http.delete(`/cursos/${id}`),
};

// ---------- Grupos (modalidad × grupo) ----------
export const gruposService = {
  listar: () => http.get('/grupos'),
  actualizar: (id, cambios) => http.patch(`/grupos/${id}`, cambios),
  // El servidor ya garantiza los 20 grupos canónicos; este método se conserva
  // por compatibilidad con el contexto y simplemente relee el catálogo.
  sincronizar: () => http.get('/grupos'),
};

// ---------- Encuestas ----------
export const encuestasService = {
  listar: () => http.get('/encuestas'),
  crear: (payload) => http.post('/encuestas', payload),
};

// ---------- Instrumento fijo de la encuesta ----------
// El backend es la fuente canónica y sirve la misma definición a ambas apps.
export const instrumentoService = {
  obtener: () => http.get('/instrumento'),
};

// ---------- Preguntas del instrumento ----------
// Copias de respaldo sincronizadas con la definición fija del backend.
export { preguntas, escalar, secciones, tituloEncuesta, subtituloEncuesta } from '../utils/instrumento.js';

// ---------- Helpers de presentación ----------
// Compatible con registros antiguos guardados con `nombres` y `apellidos`.
export function nombreDocente(d) {
  if (!d) return '—';
  return (d.nombre || [d.nombres, d.apellidos].filter(Boolean).join(' ')).trim() || '—';
}

// Acepta el formato nuevo `modalidadIds` y el antiguo `modalidadId`.
export function modalidadesDe(d) {
  if (!d) return [];
  if (Array.isArray(d.modalidadIds)) return d.modalidadIds;
  return d.modalidadId ? [d.modalidadId] : [];
}

export function nombreModalidad(modalidadId) {
  return MODALIDADES.find((m) => m.id === modalidadId)?.nombre || '—';
}

// Acepta el formato nuevo `grupoIds` y el antiguo `modalidadIds` del curso.
export function gruposDeCurso(curso) {
  if (!curso) return [];
  if (Array.isArray(curso.grupoIds)) return curso.grupoIds;
  if (Array.isArray(curso.modalidadIds)) return curso.modalidadIds;
  return [];
}

/**
 * Docentes que un estudiante puede evaluar en la modalidad y grupo elegidos:
 *  1. el docente está activo,
 *  2. enseña esa modalidad (`modalidadIds`),
 *  3. el curso al que pertenece se dicta en ese grupo (`grupoIds`).
 * Sin modalidad o sin grupo se devuelve una lista vacía: el portal nunca muestra
 * el catálogo completo.
 */
export function docentesDelGrupo(docentes, cursos, { modalidadId, grupoId } = {}) {
  if (!modalidadId || !grupoId) return [];
  const cursosPorId = new Map(cursos.map((c) => [c.id, c]));
  return docentes.filter((d) => {
    if (d.estado !== 'activo') return false;
    if (!modalidadesDe(d).includes(modalidadId)) return false;
    const curso = cursosPorId.get(d.cursoId);
    return Boolean(curso) && gruposDeCurso(curso).includes(grupoId);
  });
}

// Congela los datos del docente/curso/grupo en el momento de evaluar, para que
// el historial no cambie si luego se edita el catálogo.
export function congelarDocente(docente, curso, grupo, modalidad) {
  return {
    docenteId: docente.id,
    docenteNombre: nombreDocente(docente),
    cursoId: curso?.id,
    cursoNombre: curso ? curso.nombre : '—',
    grupoId: grupo?.id,
    grupoNombre: grupo ? grupo.nombre : '—',
    modalidadId: modalidad?.id,
    modalidadNombre: modalidad ? modalidad.nombre : '—',
  };
}
