// ===== Cliente Supabase (REST) para Cloudflare Workers =====
// Usa fetch nativo en lugar del SDK Node para ser compatible con el runtime edge.

/**
 * Convierte el cuerpo de error de PostgREST en un texto apto para una
 * cabecera HTTP. El cliente recibe el detalle ya decodificado (worker/src/index.js).
 */
function detalleError(res, texto) {
  const crudo = (texto || '').trim().replace(/\s+/g, ' ').slice(0, 180);
  return `${res.status}${crudo ? `: ${crudo}` : ''}`;
}

function cabeceras({ key }, extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

/**
 * Lee una colección del catálogo (cursos, docentes, grupos).
 * @returns {Promise<Array>} filas de la tabla.
 */
export async function leerColeccion(tabla, { url, key }) {
  const res = await fetch(`${url}/rest/v1/${tabla}?select=*`, { headers: cabeceras({ key }) });
  if (!res.ok) {
    const texto = await res.text().catch(() => '(sin cuerpo)');
    throw new Error(`Supabase GET ${tabla} ${detalleError(res, texto)}`);
  }
  return res.json();
}

/**
 * Guarda una encuesta en la tabla `encuestas` de Supabase.
 * @param {object} encuesta - Objeto de encuesta completo.
 * @param {{ url: string, key: string }} config - Credenciales de Supabase.
 */
export async function guardarEncuestaSupabase(encuesta, { url, key }) {
  const endpoint = `${url}/rest/v1/encuestas`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    // Mismas columnas camelCase que escribe el backend administrativo: las
    // respuestas del portal aparecen directamente en el panel.
    body: JSON.stringify({
      id: encuesta.id,
      "creadoEn": encuesta.creadoEn || new Date().toISOString(),
      "docenteId": encuesta.docenteId,
      "cursoId": encuesta.cursoId,
      "modalidadId": encuesta.modalidadId,
      "grupoId": encuesta.grupoId,
      "docenteNombre": encuesta.docenteNombre,
      "cursoNombre": encuesta.cursoNombre,
      "modalidadNombre": encuesta.modalidadNombre,
      "grupoNombre": encuesta.grupoNombre,
      respuestas: encuesta.respuestas,
    }),
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => '(sin cuerpo)');
    throw new Error(`Supabase POST encuestas ${detalleError(res, texto)}`);
  }
}

