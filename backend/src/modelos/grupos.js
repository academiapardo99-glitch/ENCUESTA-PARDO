// ===== Grupos (modalidad × grupo) =====
import { escribir, leer } from '../db.js';
import { gruposPorDefecto, sincronizarGrupos } from '../catalogo.js';

// Devuelve los 20 grupos canónicos (5 modalidades × A–D). Es síncrona y no
// escribe: se llama en cada request. En el arranque, `sembrarGrupos` persiste
// los que falten con los mismos ids que aquí se calculan.
export function listarGrupos() {
  return sincronizarGrupos(leer('grupos'));
}

// Id fijo para un grupo que aún no existe en la base. Así el sembrado guarda
// exactamente los ids que los cursos ya referencian y no cambian en cada arranque.
function idPorDefecto({ modalidadId, nombre }) {
  return `g-${modalidadId}-${nombre.toLowerCase()}`;
}

export async function sembrarGrupos() {
  await escribir('grupos', (previos) =>
    sincronizarGrupos(previos.length ? previos : gruposPorDefecto())
      .map((g) => (g.id ? g : { ...g, id: idPorDefecto(g) }))
  );
  return listarGrupos();
}

export async function actualizarGrupo(id, cambios) {
  let actualizado = null;
  await escribir('grupos', (previos) => {
    const idx = previos.findIndex((g) => g.id === id);
    if (idx === -1) return previos;
    actualizado = { ...previos[idx], ...cambios };
    return previos.map((g, i) => (i === idx ? actualizado : g));
  });
  return actualizado;
}
