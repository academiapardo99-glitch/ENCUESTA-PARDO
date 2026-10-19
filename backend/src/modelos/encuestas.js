// ===== Encuestas =====
// Cada encuesta congela los nombres de docente/curso/modalidad/grupo en el
// momento de responder, de modo que el historial no cambia si luego se edita
// el catálogo.
import { db, escribir, nuevoId } from '../db.js';
import { MODALIDADES } from '../catalogo.js';
import { guardarEncuestaFirestore } from '../firestore.js';

export function listarEncuestas() {
  return db().encuestas.map((e) => ({ ...e }));
}

export async function crearEncuesta(payload) {
  const encuestas = db().encuestas;
  const docente = db().docentes.find((d) => d.id === payload.docenteId);
  const curso = db().cursos.find((c) => c.id === payload.cursoId);
  const grupo = db().grupos.find((g) => g.id === payload.grupoId);
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
  if (process.env.PERSISTENCIA === 'firestore') {
    await guardarEncuestaFirestore(encuesta);
  } else {
    escribir('encuestas', [...encuestas, encuesta]);
  }
  return encuesta;
}

export function eliminarEncuesta(id) {
  const encuestas = db().encuestas;
  const antes = encuestas.length;
  escribir('encuestas', encuestas.filter((e) => e.id !== id));
  return encuestas.length !== antes;
}
