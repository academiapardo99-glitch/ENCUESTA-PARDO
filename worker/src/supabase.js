// ===== Cliente Supabase (REST) para Cloudflare Workers =====
// Usa fetch nativo en lugar del SDK Node para ser compatible con el runtime edge.

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
    throw new Error(`Supabase GET ${tabla} ${res.status}: ${texto}`);
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
    body: JSON.stringify({
      id: encuesta.id,
      creado_en: encuesta.creadoEn || new Date().toISOString(),
      docente_id: encuesta.docenteId,
      curso_id: encuesta.cursoId,
      modalidad_id: encuesta.modalidadId,
      grupo_id: encuesta.grupoId,
      docente_nombre: encuesta.docenteNombre,
      curso_nombre: encuesta.cursoNombre,
      modalidad_nombre: encuesta.modalidadNombre,
      grupo_nombre: encuesta.grupoNombre,
      respuestas: encuesta.respuestas,
    }),
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => '(sin cuerpo)');
    throw new Error(`Supabase ${res.status}: ${texto}`);
  }
}

