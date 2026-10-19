// ===== Almacén de datos =====
// Selecciona la persistencia según PERSISTENCIA:
//   - (por defecto) archivo JSON local en `data/db.json`, escritura atómica
//     (tmp + rename) para evitar corrupción si el proceso se interrumpe.
//   - 'supabase': tablas de Supabase mediante supabase.js (ver SUPABASE.md).
// La misma interfaz (`db`, `leer`, `escribir`) se usa en ambos casos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as supabase from './supabase.js';
import { sincronizarGrupos } from './catalogo.js';

// ---------- Almacén Supabase ----------
const USAR_SUPABASE = (process.env.PERSISTENCIA || '').toLowerCase() === 'supabase';

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

function guardar() {
  if (!cache || USAR_SUPABASE) return;
  asegurarDirectorio();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

function nuevoId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Carga inicial. Fallar aquí (Supabase caído, credenciales malas) es preferible
// a arrancar con la base vacía y sobrescribirla en el primer guardado.
export async function inicializarDb() {
  if (!USAR_SUPABASE) {
    cache = leerDisco();
    console.log(`Persistencia: archivo local ${DB_FILE}`);
    return cache;
  }
  // Una sola copia en memoria, compartida con supabase.js: los modelos leen
  // `db()` y escriben a través de `leer()`/`escribir()` de este módulo.
  // Verifica conexión + tablas antes de arrancar: si Supabase o el esquema
  // están mal, el despliegue muestra el motivo en el log en lugar de fallar
  // más tarde con un 500 genérico.
  const resumen = await supabase.verificarConexion();
  cache = await supabase.refrescarSupabase();
  console.log(
    'Persistencia: Supabase (los cambios NO se guardan en data/db.json) — ' +
    Object.entries(resumen).map(([tabla, n]) => `${tabla}=${n}`).join(', ')
  );
  return cache;
}

// ---------- Interfaz común ----------
export function db() {
  if (!cache) {
    if (USAR_SUPABASE) {
      throw new Error('Base de datos no inicializada: el servidor debe llamar a inicializarDb().');
    }
    cache = leerDisco();
  }
  return cache;
}

// "grupos" se devuelve normalizado. Los grupos que aún no están en la base
// (arranque con la tabla vacía) reciben un id estable derivado de modalidad +
// nombre, para que el sembrado no cambie de ids en cada arranque.
export function leer(coleccion) {
  if (!USAR_SUPABASE) return db()[coleccion];
  const filas = supabase.leer(coleccion);
  return coleccion === 'grupos' ? conIdsEstables(filas) : filas;
}

function conIdsEstables(grupos) {
  const existentes = new Set(grupos.map((g) => g.id).filter(Boolean));
  return sincronizarGrupos(grupos).map((g) =>
    existentes.has(g.id) ? g : { ...g, id: `g-${g.modalidadId}-${g.nombre.toLowerCase()}` }
  );
}

/**
 * Sustituye una colección. `items` puede ser el arreglo nuevo o una función
 * `(previos) => nuevoArreglo`; la función se evalúa sobre el estado real, dentro
 * de la cola de escritura, para no perder cambios de peticiones concurrentes.
 * `filas()` adapta los objetos al esquema relacional (p. ej. `creadoEn` →
 * `creado_en` en la tabla de encuestas).
 */
export async function escribir(coleccion, items, filas) {
  if (!USAR_SUPABASE) {
    const nuevos = typeof items === 'function' ? items(db()[coleccion]) : items;
    db()[coleccion] = nuevos;
    guardar();
    return nuevos;
  }
  return supabase.escribir(coleccion, items, filas);
}

export { DB_FILE, USAR_SUPABASE, nuevoId };
