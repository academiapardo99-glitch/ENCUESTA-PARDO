import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sincronizarGrupos } from '../backend/src/catalogo.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivoDb = path.join(raiz, 'backend', 'data', 'db.json');
const archivoSeed = path.join(raiz, 'backend', 'data', 'portal-seed.json');

let db;
try {
  db = JSON.parse(fs.readFileSync(archivoDb, 'utf8'));
} catch (error) {
  console.error(`No se pudo leer ${archivoDb}: ${error.message}`);
  process.exit(1);
}

const cursos = (Array.isArray(db.cursos) ? db.cursos : [])
  .filter((curso) => curso?.id && curso.nombre?.trim() && curso.activo !== false)
  .map(({ id, nombre, grupoIds, activo }) => ({
    id,
    nombre: nombre.trim(),
    grupoIds: Array.isArray(grupoIds) ? grupoIds : [],
    activo: activo !== false,
  }));
const idsCursos = new Set(cursos.map((curso) => curso.id));

const docentes = (Array.isArray(db.docentes) ? db.docentes : [])
  .filter((docente) => docente?.id && docente.nombre?.trim() && docente.estado === 'activo' && idsCursos.has(docente.cursoId))
  .map(({ id, nombre, cursoId, modalidadIds, estado }) => ({
    id,
    nombre: nombre.trim(),
    cursoId,
    modalidadIds: Array.isArray(modalidadIds) ? modalidadIds : [],
    estado: 'activo',
  }));

const grupos = sincronizarGrupos(Array.isArray(db.grupos) ? db.grupos : []);

const seed = { cursos, docentes, encuestas: [], grupos, instrumento: {} };
fs.writeFileSync(archivoSeed, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');

console.log(`Catálogo exportado a backend/data/portal-seed.json`);
console.log(`Cursos activos: ${cursos.length}; docentes activos: ${docentes.length}; grupos: ${grupos.length}.`);
if (cursos.length === 0 || docentes.length === 0) {
  console.warn('El portal se desplegará sin un catálogo completo; registra cursos y docentes activos antes de publicarlo.');
}
