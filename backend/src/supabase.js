// ===== Almacén de datos en Supabase =====
// Persistencia del backend sobre PostgREST (fetch nativo, sin SDK), usada desde
// `db.js` cuando PERSISTENCIA=supabase. `refrescarSupabase` carga las colecciones
// en memoria al arrancar; `escribir` sube la colección completa.
//
// Se activa con PERSISTENCIA=supabase y las variables:
//   SUPABASE_URL               https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  clave secreta (solo servidor, nunca en el frontend)
//
// Esquema requerido: ver SUPABASE.md (tablas cursos, docentes, grupos, encuestas).

const COLECCIONES = ['cursos', 'docentes', 'encuestas', 'grupos'];

// Cada tabla tiene columnas en camelCase que los modelos usan tal cual, salvo
// las encuestas (PostgREST devuelve `creadoEn` como texto, hay que ordenar etc.).
const VACIO = () => ({ cursos: [], docentes: [], encuestas: [], grupos: [], instrumento: {} });

let cache = null;
let refresco = null;

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
  if (!url || !key) {
    throw new Error(
      'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Configúralas para usar PERSISTENCIA=supabase.'
    );
  }
  return { url, key };
}

function cabeceras(extra = {}) {
  const { key } = config();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function endpoint(tabla, query = '') {
  const { url } = config();
  return `${url}/rest/v1/${tabla}${query ? `?${query}` : ''}`;
}

async function leerTabla(tabla) {
  const res = await fetch(endpoint(tabla, 'select=*'), { headers: cabeceras() });
  if (!res.ok) {
    const texto = await res.text().catch(() => '(sin cuerpo)');
    throw new Error(`Supabase GET ${tabla} ${res.status}: ${texto}`);
  }
  return res.json();
}

// Carga todas las colecciones desde Supabase. Se hace una sola vez al arrancar
// (antes de abrir el puerto); los modelos usan luego la caché, ya que reemplazan
// las colecciones enteras y la recarga no los deja obsoletos.
export async function refrescarSupabase() {
  if (refresco) return refresco;
  if (cache) return cache;
  refresco = (async () => {
    const [cursos, docentes, grupos, encuestas] = await Promise.all([
      leerTabla('cursos'),
      leerTabla('docentes'),
      leerTabla('grupos'),
      leerTabla('encuestas'),
    ]);
    cache = { ...VACIO(), cursos, docentes, grupos, encuestas };
    return cache;
  })();
  try {
    return await refresco;
  } finally {
    refresco = null;
  }
}

// Devuelve la última copia en memoria (null si aún no se cargó).
export function db() {
  return cache;
}

// No-op: la escritura ocurre en `escribir`, que sincroniza con Supabase.
export function guardar() { }

export function leer(coleccion) {
  return db()?.[coleccion] || [];
}

// Sustituye una colección en Supabase. `items` es el arreglo nuevo o una
// función `(previos) => nuevoArreglo` evaluada dentro de la cola, de modo que
// las peticiones concurrentes no se pisan. `filas()` adapta los objetos al
// esquema relacional (p. ej. `creadoEn` → `creado_en` en las encuestas).
const cola = {};

async function subirColeccion(coleccion, items, filas = (lista) => lista) {
  if (!cache) cache = await refrescarSupabase();
  const lista = typeof items === 'function' ? items(cache?.[coleccion] || []) : items;
  const enviadas = filas(lista);
  const res = await fetch(endpoint(coleccion), {
    method: 'POST',
    headers: cabeceras({
      // Upsert: el catálogo se reescribe entero; los ids existentes se actualizan.
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(enviadas),
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => '(sin cuerpo)');
    throw new Error(`Supabase POST ${coleccion} ${res.status}: ${texto}`);
  }

  // PostgREST no soporta "replace all": se comparan las claves enviadas con las
  // existentes y se eliminan las filas que ya no están en la lista.
  const clave = claveDe(coleccion);
  const conservar = new Set(enviadas.map((f) => f[clave]));
  const actuales = await fetch(endpoint(coleccion, `select=${clave}`), { headers: cabeceras() });
  if (!actuales.ok) {
    cache = { ...cache, [coleccion]: lista };
    return lista;
  }
  const sobrantes = (await actuales.json()).filter((f) => !conservar.has(f[clave]));
  if (sobrantes.length) {
    const filtros = sobrantes.map((f) => `${clave}=eq.${encodeURIComponent(f[clave])}`).join(',');
    await fetch(endpoint(coleccion, `or=(${filtros})`), {
      method: 'DELETE',
      headers: cabeceras(),
    });
  }

  // Lo enviado ya está en Supabase: la caché en memoria se queda con las filas
  // tal como las usa la app (sin conversión de `creadoEn`).
  cache = { ...(cache || {}), [coleccion]: lista };
  return lista;
}

/**
 * Igual que `escribir`, pero serializa las escrituras por colección: dos
 * upserts concurrentes leerían el mismo estado y uno de los borrados eliminaría
 * la fila que acaba de crear el otro.
 */
export function escribir(coleccion, items, filas = (lista) => lista) {
  const anterior = cola[coleccion] || Promise.resolve();
  const siguiente = anterior
    .catch(() => {})
    .then(() => subirColeccion(coleccion, items, filas));
  cola[coleccion] = siguiente;
  return siguiente.finally(() => {
    if (cola[coleccion] === siguiente) delete cola[coleccion];
  });
}

// Columna que identifica cada fila. En Supabase las encuestas usan
// `creado_en` como clave primaria (ver SUPABASE.md).
const CLAVES = { cursos: 'id', docentes: 'id', grupos: 'id', encuestas: 'creado_en' };
function claveDe(coleccion) {
  return CLAVES[coleccion] || 'id';
}

export function nuevoId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export { COLECCIONES };
