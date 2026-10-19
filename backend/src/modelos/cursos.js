// ===== Cursos =====
// Un curso se compone únicamente de su nombre y de los grupos a los que
// pertenece (p. ej. el Grupo A de Colegio y el Grupo B de Ordinario).
import { db, escribir, nuevoId } from '../db.js';

export function gruposDeCurso(curso) {
  if (!curso) return [];
  if (Array.isArray(curso.grupoIds)) return curso.grupoIds;
  if (Array.isArray(curso.modalidadIds)) return curso.modalidadIds;
  return [];
}

function normalizar(datos, existente = {}) {
  return {
    ...existente,
    id: existente.id || nuevoId(),
    nombre: String(datos.nombre ?? existente.nombre ?? '').trim(),
    grupoIds: [...new Set(gruposDeCurso(datos.grupoIds ? datos : existente))],
    activo: (datos.activo ?? existente.activo) !== false,
    creadoEn: existente.creadoEn || new Date().toISOString(),
  };
}

export function listarCursos() {
  return db().cursos.map((c) => normalizar({}, c));
}

export function crearCurso(datos) {
  const cursos = db().cursos;
  const nuevo = normalizar(datos);
  escribir('cursos', [...cursos, nuevo]);
  return nuevo;
}

export function actualizarCurso(id, cambios) {
  const cursos = db().cursos;
  const idx = cursos.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const actualizado = normalizar(cambios, cursos[idx]);
  cursos[idx] = actualizado;
  escribir('cursos', cursos);
  return actualizado;
}

export function eliminarCurso(id) {
  const cursos = db().cursos;
  const antes = cursos.length;
  escribir('cursos', cursos.filter((c) => c.id !== id));
  return cursos.length !== antes;
}
