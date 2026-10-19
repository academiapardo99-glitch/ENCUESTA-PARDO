// ===== Validaciones compartidas =====
import { nombreDocente } from '../services/dataService.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(email) {
  if (!email || !email.trim()) return null; // opcional
  return EMAIL_RE.test(email.trim()) ? null : 'Formato de correo inválido.';
}

export function validarTextoObligatorio(valor, campo) {
  if (!valor || !valor.trim()) return `${campo} es obligatorio.`;
  return null;
}

export function validarDocente(docente, docentesExistentes, idActual = null) {
  const errores = {};
  const errNombre = validarTextoObligatorio(docente.nombre, 'El nombre del docente');
  if (errNombre) errores.nombre = errNombre;
  if (!docente.cursoId) errores.cursoId = 'Debe seleccionar un curso.';
  // Unicidad de nombre (un docente no puede registrarse dos veces con el mismo nombre)
  if (docente.nombre && docente.nombre.trim()) {
    const dup = docentesExistentes.some(
      (d) => nombreDocente(d).trim().toLowerCase() === docente.nombre.trim().toLowerCase() && d.id !== idActual
    );
    if (dup) errores.nombre = 'Ya existe un docente con este nombre.';
  }
  return errores;
}

export function validarCurso(curso, cursosExistentes, idActual = null) {
  const errores = {};
  const err = validarTextoObligatorio(curso.nombre, 'Nombre del curso');
  if (err) {
    errores.nombre = err;
  } else {
    const dup = cursosExistentes.some(
      (c) => c.nombre.trim().toLowerCase() === curso.nombre.trim().toLowerCase() && c.id !== idActual
    );
    if (dup) errores.nombre = 'Ya existe un curso con este nombre.';
  }
  if (!curso.grupoIds || curso.grupoIds.length === 0) {
    errores.grupoIds = 'Seleccione al menos un grupo.';
  }
  return errores;
}
