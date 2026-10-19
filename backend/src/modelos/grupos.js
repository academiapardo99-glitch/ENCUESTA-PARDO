// ===== Grupos (modalidad × grupo) =====
import { db, escribir } from '../db.js';
import { gruposPorDefecto, sincronizarGrupos } from '../catalogo.js';

// Devuelve los 16 grupos canónicos, sincronizando el archivo si hace falta.
export function listarGrupos() {
  const actuales = db().grupos;
  const sincronizados = sincronizarGrupos(actuales);
  const cambio =
    sincronizados.length !== actuales.length ||
    sincronizados.some((g, i) => g.id !== actuales[i]?.id || g.activo !== actuales[i]?.activo);
  if (cambio) escribir('grupos', sincronizados);
  return sincronizados;
}

export function sembrarGrupos() {
  escribir('grupos', sincronizarGrupos(db().grupos.length ? db().grupos : gruposPorDefecto()));
  return db().grupos;
}

export function actualizarGrupo(id, cambios) {
  const grupos = listarGrupos();
  const idx = grupos.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  grupos[idx] = { ...grupos[idx], ...cambios };
  escribir('grupos', grupos);
  return grupos[idx];
}
