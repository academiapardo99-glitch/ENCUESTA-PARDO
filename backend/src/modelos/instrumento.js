// ===== Instrumento fijo de encuesta =====
// El catálogo está versionado en código; los valores antiguos de
// `db.json.instrumento` se ignoran para que la encuesta no cambie al reiniciar.
import { INSTRUMENTO_POR_DEFECTO } from '../catalogo.js';

export function obtenerInstrumento() {
  return structuredClone(INSTRUMENTO_POR_DEFECTO);
}

export function preguntasVigentes() {
  return INSTRUMENTO_POR_DEFECTO.preguntas;
}
