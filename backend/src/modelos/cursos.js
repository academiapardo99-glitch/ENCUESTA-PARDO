// ===== Cursos =====
// Un curso se compone únicamente de su nombre y de los grupos a los que
// pertenece (p. ej. el Grupo A de Colegio y el Grupo B de Ordinario).
import { escribir, leer, nuevoId } from '../db.js';
import { listarDocentes } from './docentes.js';

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
  return leer('cursos').map((c) => normalizar({}, c));
}

export async function crearCurso(datos) {
  const nuevo = normalizar(datos);
  await escribir('cursos', (previos) => [...previos, nuevo]);
  return nuevo;
}

export async function actualizarCurso(id, cambios) {
  let actualizado = null;
  await escribir('cursos', (previos) => {
    const idx = previos.findIndex((c) => c.id === id);
    if (idx === -1) return previos;
    actualizado = normalizar(cambios, previos[idx]);
    return previos.map((c, i) => (i === idx ? actualizado : c));
  });
  return actualizado;
}

export async function eliminarCurso(id) {
  // Se comprueba con el catálogo normalizado (los registros guardados pueden no
  // tener id aún, pero listarCursos() siempre lo asigna).
  if (!listarCursos().some((c) => c.id === id)) return null;

  let resultado = null;
  let trasCurso = null;
  await escribir('cursos', (previos) => {
    const idx = previos.findIndex((c) => c.id === id);
    if (idx === -1) return previos;

    // Un docente no puede quedar apuntando a un curso inexistente (se vería "—"
    // en la tabla). Se reasignan a otro curso de los mismos grupos si existe; si
    // no, se desactivan para conservar su historial.
    const curso = previos[idx];
    const grupos = new Set(gruposDeCurso(curso));
    const sustituto = previos.find(
      (c) => c.id !== id && gruposDeCurso(c).some((g) => grupos.has(g))
    );

    const afectados = listarDocentes().filter((d) => d.cursoId === id);
    if (afectados.length) {
      // El movimiento de docentes se hace después de este guardado.
      trasCurso = (lista) => lista.map((d) => {
        if (d.cursoId !== id) return d;
        return sustituto
          ? { ...d, cursoId: sustituto.id }
          : { ...d, cursoId: '', estado: 'inactivo' };
      });
    }

    resultado = { curso, docentesAfectados: afectados.length, reasignadosA: sustituto?.nombre || null };
    return previos.filter((c) => c.id !== id);
  });

  if (trasCurso) await escribir('docentes', trasCurso);
  return resultado;
}
