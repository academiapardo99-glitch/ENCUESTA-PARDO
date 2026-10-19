// Control de encuestas ya enviadas desde este dispositivo.
// El portal es anónimo: el servidor no sabe quién responde, así que el avance
// se guarda en localStorage del navegador, separado por modalidad y grupo.
// Es una ayuda de usabilidad (evitar repetir y ver qué falta), no una regla de
// seguridad: borrar los datos del navegador lo reinicia.
const CLAVE = 'encuesta-docentes:evaluados:v1';

function leerTodo() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const datos = crudo ? JSON.parse(crudo) : null;
    // Forma: { [grupoId]: { [docenteId]: { cursoId, fecha } } }
    return datos && typeof datos === 'object' ? datos : {};
  } catch {
    return {};
  }
}

function guardarTodo(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    // Modo privado o cuota llena: el portal sigue funcionando sin esta marca.
  }
}

/** Docentes ya evaluados en un grupo: Map { docenteId: { cursoId, fecha } }. */
export function evaluadosDelGrupo(grupoId) {
  if (!grupoId) return new Map();
  return new Map(Object.entries(leerTodo()[grupoId] || {}));
}

/** Marca a un docente como evaluado en la modalidad y grupo indicados. */
export function marcarEvaluado(grupoId, docenteId, cursoId) {
  if (!grupoId || !docenteId) return;
  const todo = leerTodo();
  todo[grupoId] = {
    ...todo[grupoId],
    [docenteId]: { cursoId: cursoId || '', fecha: new Date().toISOString() },
  };
  guardarTodo(todo);
  avisarCambio();
}

/** Borra el avance de este dispositivo (útil si otra persona usa el equipo). */
export function reiniciarEvaluados() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Ignorar.
  }
  avisarCambio();
}

// Permite que varias pestañas abiertas del portal se enteren del cambio.
export function onEvaluadosChange(callback) {
  const alCambiar = (evento) => {
    if (evento.key !== CLAVE && evento.key !== null) return;
    callback();
  };
  // Cuando la app reescribe el valor, `storage` no se dispara en la misma
  // pestaña; se usa un evento propio para avisar al instante.
  window.addEventListener('storage', alCambiar);
  window.addEventListener('evaluados-change', callback);
  return () => {
    window.removeEventListener('storage', alCambiar);
    window.removeEventListener('evaluados-change', callback);
  };
}

function avisarCambio() {
  try {
    window.dispatchEvent(new Event('evaluados-change'));
  } catch {
    // Sin window (p. ej. pruebas en Node): no hace falta avisar.
  }
}
