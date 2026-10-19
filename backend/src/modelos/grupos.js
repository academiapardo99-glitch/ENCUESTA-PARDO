// ===== Grupos (modalidad × grupo) =====
import { db, escribir, leer } from '../db.js';
import { gruposPorDefecto, sincronizarGrupos } from '../catalogo.js';

// Devuelve los 20 grupos canónicos. Es síncrona y no escribe: se llama en cada
// request y no debe disparar guardados (en Supabase serían peticiones extra).
export function listarGrupos() {
  return sincronizarGrupos(leer('grupos'));
}

export async function sembrarGrupos() {
  await escribir('grupos', (previos) =>
    sincronizarGrupos(previos.length ? previos : gruposPorDefecto())
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
