// ===== Docentes =====
import { db, escribir, nuevoId } from '../db.js';

// El modelo actual solo usa: nombre, cursoId y modalidadIds (modalidades que
// enseña). Se conservan los campos antiguos (nombres, apellidos, correo,
// especialidad, codigo) si llegan, para no romper registros previos.
function normalizar(datos, existente = {}) {
  const nombre = String(datos.nombre ?? existente.nombre ?? '').trim();
  const cursoId = datos.cursoId ?? existente.cursoId ?? '';
  const modalidadIds = Array.isArray(datos.modalidadIds)
    ? [...new Set(datos.modalidadIds)]
    : Array.isArray(existente.modalidadIds)
      ? existente.modalidadIds
      : [];

  return {
    ...existente,
    id: existente.id || nuevoId(),
    nombre,
    cursoId,
    modalidadIds,
    estado: datos.estado ?? existente.estado ?? 'activo',
    codigo: datos.codigo ?? existente.codigo,
    correo: datos.correo ?? existente.correo,
    nombres: datos.nombres ?? existente.nombres,
    apellidos: datos.apellidos ?? existente.apellidos,
    especialidad: datos.especialidad ?? existente.especialidad,
    creadoEn: existente.creadoEn || new Date().toISOString(),
  };
}

export function listarDocentes() {
  return db().docentes.map((d) => normalizar({}, d));
}

export function crearDocente(datos) {
  const docentes = db().docentes;
  const nuevo = normalizar(datos);
  // Genera un código correlativo si el modelo legado lo espera.
  const numero = docentes.length + 1;
  nuevo.codigo = nuevo.codigo || `DOC-${String(numero).padStart(3, '0')}`;
  escribir('docentes', [...docentes, nuevo]);
  return nuevo;
}

export function actualizarDocente(id, cambios) {
  const docentes = db().docentes;
  const idx = docentes.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const actualizado = normalizar(cambios, docentes[idx]);
  docentes[idx] = actualizado;
  escribir('docentes', docentes);
  return actualizado;
}

export function eliminarDocente(id) {
  const docentes = db().docentes;
  const restantes = docentes.filter((d) => d.id !== id);
  // OJO: `escribir` reasigna db().docentes al arreglo nuevo, así que hay que
  // comparar contra el arreglo GUARDADO. Comparar `docentes` (la referencia
  // antigua) daba siempre false y el DELETE respondía 404 aunque borrase.
  escribir('docentes', restantes);
  return restantes.length !== docentes.length;
}
