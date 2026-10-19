// ===== Cliente HTTP =====
// Único punto de salida hacia la API. Centraliza URL base, cabeceras y el
// manejo de errores para que el resto del código no sepa de `fetch`.
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = 'ApiError';
    this.estado = estado;
  }
}

async function peticion(ruta, { method = 'GET', body } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifique que la API esté en ejecución.',
      0
    );
  }

  if (respuesta.status === 204) return null;

  const texto = await respuesta.text();
  const datos = texto ? safeJson(texto) : null;

  if (!respuesta.ok) {
    const mensaje =
      (datos && (datos.error || datos.message)) ||
      `Error ${respuesta.status} al comunicarse con el servidor.`;
    throw new ApiError(mensaje, respuesta.status);
  }
  return datos;
}

function safeJson(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export const http = {
  get: (ruta) => peticion(ruta),
  post: (ruta, body) => peticion(ruta, { method: 'POST', body }),
  put: (ruta, body) => peticion(ruta, { method: 'PUT', body }),
  patch: (ruta, body) => peticion(ruta, { method: 'PATCH', body }),
  delete: (ruta) => peticion(ruta, { method: 'DELETE' }),
};
