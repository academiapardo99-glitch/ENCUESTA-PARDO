// ===== Encuestas =====
// Cada encuesta congela los nombres de docente/curso/modalidad/grupo en el
// momento de responder, de modo que el historial no cambia si luego se edita
// el catálogo.
import { db, escribir, leer, nuevoId, USAR_SUPABASE } from '../db.js';
import { MODALIDADES } from '../catalogo.js';
import { guardarEncuestaFirestore } from '../firestore.js';
import { listarGrupos } from './grupos.js';
import { listarDocentes } from './docentes.js';
import { listarCursos } from './cursos.js';

// En Supabase la tabla `encuestas` usa `creado_en` como clave primaria y
// respuestas en JSONB; en local se conserva el objeto tal cual.
function filaEncuesta(e) {
  if (!USAR_SUPABASE) return e;
  const { creadoEn, ...resto } = e;
  return { ...resto, creado_en: creadoEn };
}

function desdeFilaEncuesta(fila) {
  const { creado_en, ...resto } = fila;
  return { ...resto, creadoEn: creado_en };
}

export function listarEncuestas() {
  const encuestas = leer('encuestas');
  return encuestas
    .map((e) => ({ ...(e.creado_en ? desdeFilaEncuesta(e) : e) }))
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
  if (process.env.PERSISTENCIA === 'firestore') {
    await guardarEncuestaFirestore(encuesta);
  } else {
    await escribir('encuestas', (previas) => [...previas, encuesta], (items) => items.map(filaEncuesta));
  }
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
