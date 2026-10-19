// ===== Docentes =====
import { db, escribir, leer, nuevoId } from '../db.js';

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
  return leer('docentes').map((d) => normalizar({}, d));
}

// El nombre del parámetro es `previos`: dentro del callback, `docentes` se
// refiere a la colección ya actualizada por escrituras concurrentes.
export async function crearDocente(datos) {
  const nuevo = normalizar(datos);
  await escribir('docentes', (previos) => {
    // Genera un código correlativo si el modelo legado lo espera.
    nuevo.codigo = nuevo.codigo || `DOC-${String(previos.length + 1).padStart(3, '0')}`;
    return [...previos, nuevo];
  });
  return nuevo;
}

export async function actualizarDocente(id, cambios) {
  let actualizado = null;
  await escribir('docentes', (previos) => {
    const idx = previos.findIndex((d) => d.id === id);
    if (idx === -1) return previos;
    actualizado = normalizar(cambios, previos[idx]);
    return previos.map((d, i) => (i === idx ? actualizado : d));
  });
  return actualizado;
}

export async function eliminarDocente(id) {
  let eliminado = false;
  // OJO: Comparar la referencia antigua daba siempre false y el DELETE respondía
  // 404 aunque borrase; aquí se compara dentro del callback, sobre el estado real.
  await escribir('docentes', (previos) => {
    eliminado = previos.some((d) => d.id === id);
    return previos.filter((d) => d.id !== id);
  });
  return eliminado;
}
