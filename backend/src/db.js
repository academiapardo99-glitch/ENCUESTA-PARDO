// ===== Almacén de datos en archivo JSON =====
// Persistencia simple y sin dependencias nativas: cada colección se guarda
// como un arreglo en `data/db.json`. Escritura atómica (tmp + rename) para
// evitar corrupción si el proceso se interrumpe.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(DATA_DIR, 'portal-seed.json');

const COLECCIONES = ['cursos', 'docentes', 'encuestas', 'grupos', 'instrumento'];

const VACIO = {
  cursos: [],
  docentes: [],
  encuestas: [],
  grupos: [],
  // Diseño de la encuesta (preguntas y escala). Vacío = usar el diseño por defecto.
  instrumento: {},
};

let cache = null;

function asegurarDirectorio() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function leerDisco() {
  asegurarDirectorio();
  if (!fs.existsSync(DB_FILE) && !fs.existsSync(SEED_FILE)) return structuredClone(VACIO);
  try {
    const archivo = fs.existsSync(DB_FILE) ? DB_FILE : SEED_FILE;
    const crudo = fs.readFileSync(archivo, 'utf8');
    if (!crudo.trim()) return structuredClone(VACIO);
    const datos = JSON.parse(crudo);
    const base = structuredClone(VACIO);
    for (const col of COLECCIONES) {
      const valor = datos[col];
      if (col === 'instrumento') {
        base[col] = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
      } else {
        base[col] = Array.isArray(valor) ? valor : [];
      }
    }
    return base;
  } catch {
    // Archivo corrupto: no se pierde el original, se renombra como respaldo.
    const respaldo = `${DB_FILE}.corrupto-${Date.now()}`;
    try { fs.renameSync(DB_FILE, respaldo); } catch { /* ignorar */ }
    return structuredClone(VACIO);
  }
}

export function db() {
  if (!cache) cache = leerDisco();
  return cache;
}

export function guardar() {
  if (!cache) return;
  asegurarDirectorio();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

export function leer(coleccion) {
  return db()[coleccion];
}

export function escribir(coleccion, items) {
  db()[coleccion] = items;
  guardar();
  return items;
}

export function nuevoId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export { DB_FILE };
