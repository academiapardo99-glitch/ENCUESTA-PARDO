// ===== Capa de servicios con localStorage =====
// Un único punto de acceso a los datos, pensado para migrar a Supabase/API
// manteniendo la misma interfaz (métodos asíncronos).

const KEYS = {
  docentes: 'sge_docentes',
  cursos: 'sge_cursos',
  encuestas: 'sge_encuestas',
  grupos: 'sge_grupos',
  opciones: 'sge_opciones',
};

// Cada docente/modalidad/grupo apunta a las modalidades de estudio que enseña
// o a las que pertenece. Se conserva por compatibilidad con la app original.

function leer(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function guardar(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function delay(ms = 150) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Cursos ----------
// Un curso se compone únicamente de su nombre y de los grupos a los que
// pertenece (p. ej. Grupo A y Grupo B de una modalidad).
// Compatible con el modelo anterior (descripcion/activo), ya no usado.
// Devuelve los ids de los grupos asignados a un curso (acepta el formato
// nuevo `grupoIds` y el antiguo `modalidadIds`).
export function gruposDeCurso(curso) {
  if (!curso) return [];
  if (Array.isArray(curso.grupoIds)) return curso.grupoIds;
  if (Array.isArray(curso.modalidadIds)) return curso.modalidadIds;
  return [];
}

// Nombres legibles de los grupos de un curso, ordenados por modalidad y letra.
export function nombresGruposDeCurso(curso, grupos = []) {
  const ids = gruposDeCurso(curso);
  const encontrados = ids
    .map((id) => grupos.find((g) => g.id === id))
    .filter(Boolean);
  const ordenModalidad = (g) => {
    const i = MODALIDADES.findIndex((m) => m.id === g.modalidadId);
    return i === -1 ? 99 : i;
  };
  return encontrados
    .sort((a, b) => ordenModalidad(a) - ordenModalidad(b) || String(a.nombre).localeCompare(String(b.nombre), 'es'))
    .map((g) => {
      const m = MODALIDADES.find((x) => x.id === g.modalidadId);
      return m ? `${m.nombre} — Grupo ${g.nombre}` : `Grupo ${g.nombre}`;
    });
}

export const cursosService = {
  async listar() {
    await delay();
    // Normaliza registros antiguos que no guardaban el estado `activo`.
    return leer(KEYS.cursos).map((c) => ({
      ...c,
      activo: c.activo !== false,
      grupoIds: gruposDeCurso(c),
    }));
  },
  async crear({ nombre, grupoIds = [], activo = true }) {
    await delay();
    const cursos = leer(KEYS.cursos);
    const curso = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      grupoIds: [...new Set(grupoIds)], // grupos a los que pertenece el curso
      activo, // estado del curso (activo/inactivo)
      creadoEn: new Date().toISOString(),
    };
    cursos.push(curso);
    guardar(KEYS.cursos, cursos);
    return curso;
  },
  async actualizar(id, cambios) {
    await delay();
    const cursos = leer(KEYS.cursos);
    const idx = cursos.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Curso no encontrado');
    cursos[idx] = { ...cursos[idx], ...cambios };
    guardar(KEYS.cursos, cursos);
    return cursos[idx];
  },
  async eliminar(id) {
    await delay();
    const cursos = leer(KEYS.cursos).filter((c) => c.id !== id);
    guardar(KEYS.cursos, cursos);
  },
};

// ---------- Docentes ----------
function siguienteCodigo(docentes) {
  let max = 0;
  docentes.forEach((d) => {
    const m = /^DOC-(\d+)$/.exec(d.codigo);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `DOC-${String(max + 1).padStart(3, '0')}`;
}

export const docentesService = {
  async listar() {
    await delay();
    return leer(KEYS.docentes);
  },
  async crear(datos) {
    await delay();
    const docentes = leer(KEYS.docentes);
    const docente = {
      id: crypto.randomUUID(),
      codigo: siguienteCodigo(docentes),
      nombre: datos.nombre.trim(),
      cursoId: datos.cursoId,
      modalidadIds: [...new Set(datos.modalidadIds || [])], // modalidades que enseña
      estado: 'activo',
      creadoEn: new Date().toISOString(),
    };
    docentes.push(docente);
    guardar(KEYS.docentes, docentes);
    return docente;
  },
  async actualizar(id, cambios) {
    await delay();
    const docentes = leer(KEYS.docentes);
    const idx = docentes.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Docente no encontrado');
    docentes[idx] = { ...docentes[idx], ...cambios };
    guardar(KEYS.docentes, docentes);
    return docentes[idx];
  },
  async cambiarEstado(id) {
    const docentes = leer(KEYS.docentes);
    const d = docentes.find((x) => x.id === id);
    if (!d) throw new Error('Docente no encontrado');
    return this.actualizar(id, { estado: d.estado === 'activo' ? 'inactivo' : 'activo' });
  },
  async eliminar(id) {
    await delay();
    guardar(KEYS.docentes, leer(KEYS.docentes).filter((d) => d.id !== id));
  },
};

// ---------- Modalidades de estudio ----------
// Cada modalidad agrupa a los alumnos en los grupos fijos A, B, C y D.
export const MODALIDADES = [
  { id: 'colegio', nombre: 'Colegio', icono: 'escuela', descripcion: 'Alumnos que provienen del nivel secundario' },
  { id: 'primera', nombre: 'Primera Opción', icono: 'estrella', descripcion: 'Postulantes que eligen esta carrera como primera opción' },
  { id: 'ordinario', nombre: 'Ordinario', icono: 'universidad', descripcion: 'Admisión en el examen ordinario' },
  { id: 'cepu', nombre: 'Ordinario Cepru', icono: 'verificado', descripcion: 'Centro de Estudios Preuniversitarios' },
];

// Todos los grados de cada modalidad se dividen siempre en estos 4 grupos.
export const GRUPOS_BASE = ['A', 'B', 'C', 'D'];

export const gruposService = {
  async listar() {
    await delay();
    return leer(KEYS.grupos);
  },
  async crear({ modalidadId, nombre }) {
    await delay();
    const grupos = leer(KEYS.grupos);
    const grupo = {
      id: crypto.randomUUID(),
      modalidadId,
      nombre: nombre.trim().toUpperCase(),
      activo: true,
      creadoEn: new Date().toISOString(),
    };
    grupos.push(grupo);
    guardar(KEYS.grupos, grupos);
    return grupo;
  },
  async eliminar(id) {
    await delay();
    guardar(KEYS.grupos, leer(KEYS.grupos).filter((g) => g.id !== id));
  },
  // Sembrado idempotente: deja EXACTAMENTE un grupo por modalidad × grupo (A–D).
  // Elimina duplicados y grupos de modalidades que ya no existen, y conserva
  // el estado (activo/inactivo) del primer registro válido de cada combinación.
  async sincronizar(esperados) {
    await delay();
    const actuales = leer(KEYS.grupos);
    const clave = (g) => `${g.modalidadId}|${g.nombre}`;
    const esperadas = new Set(esperados.map(clave));

    const unicos = [];
    const vistas = new Set();
    for (const g of actuales) {
      const k = clave(g);
      if (!esperadas.has(k) || vistas.has(k)) continue; // ajeno o duplicado
      vistas.add(k);
      unicos.push(g);
    }

    for (const e of esperados) {
      if (vistas.has(clave(e))) continue;
      unicos.push({
        id: crypto.randomUUID(),
        modalidadId: e.modalidadId,
        nombre: e.nombre,
        activo: true,
        creadoEn: new Date().toISOString(),
      });
    }

    const orden = (g) =>
      esperados.findIndex((e) => e.modalidadId === g.modalidadId && e.nombre === g.nombre);
    unicos.sort((a, b) => orden(a) - orden(b));

    const cambió = unicos.length !== actuales.length ||
      unicos.some((g, i) => g.id !== actuales[i]?.id);
    if (cambió) guardar(KEYS.grupos, unicos);
    return unicos;
  },
  async actualizar(id, cambios) {
    await delay();
    const grupos = leer(KEYS.grupos);
    const idx = grupos.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error('Grupo no encontrado');
    grupos[idx] = { ...grupos[idx], ...cambios };
    guardar(KEYS.grupos, grupos);
    return grupos[idx];
  },
};

// Genera la combinación modalidad × grupo (A–D) si aún no existe.
// Con 4 modalidades y 4 grupos fijos son siempre 16 grupos.
export function gruposPorDefecto() {
  const lista = [];
  MODALIDADES.forEach((m) => {
    GRUPOS_BASE.forEach((g) => {
      lista.push({
        id: `g-${m.id}-${g}`,
        modalidadId: m.id,
        nombre: g,
        activo: true,
        creadoEn: new Date().toISOString(),
      });
    });
  });
  return lista;
}

// ---------- Encuestas ----------
export const encuestasService = {
  async listar() {
    await delay();
    return leer(KEYS.encuestas);
  },
  async crear({ docenteId, cursoId, respuestas, modalidadId, grupoId, grupoNombre, opcionId, opcionNombre }) {
    await delay();
    const encuestas = leer(KEYS.encuestas);
    const encuesta = {
      id: crypto.randomUUID(),
      docenteId, // identificador inmutable del docente evaluado
      cursoId,
      modalidadId, // modalidad del alumno que responde
      grupoId,     // grupo dentro de la modalidad (Grupo A, B, C…)
      grupoNombre, // nombre congelado para el historial
      opcionId: opcionId || null,         // opción personalizada (si aplica)
      opcionNombre: opcionNombre || null, // nombre congelado para el historial
      respuestas,  // { [preguntaId]: 1..5 }
      creadoEn: new Date().toISOString(),
    };
    encuestas.push(encuesta);
    guardar(KEYS.encuestas, encuestas);
    return encuesta;
  },
  async eliminar(id) {
    await delay();
    guardar(KEYS.encuestas, leer(KEYS.encuestas).filter((e) => e.id !== id));
  },
};

// ---------- Opciones de contexto (modalidad / grupo / jornada…) ----------
// El administrador puede ampliar estas listas sin tocar el código fuente.
export const opcionesService = {
  async listar() {
    await delay();
    return leer(KEYS.opciones);
  },
  async crear({ nombre, tipo = 'otro' }) {
    await delay();
    const opciones = leer(KEYS.opciones);
    const opcion = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      tipo,
      activo: true,
      creadoEn: new Date().toISOString(),
    };
    opciones.push(opcion);
    guardar(KEYS.opciones, opciones);
    return opcion;
  },
  async actualizar(id, cambios) {
    await delay();
    const opciones = leer(KEYS.opciones);
    const idx = opciones.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Opción no encontrada');
    opciones[idx] = { ...opciones[idx], ...cambios };
    guardar(KEYS.opciones, opciones);
    return opciones[idx];
  },
  async eliminar(id) {
    await delay();
    guardar(KEYS.opciones, leer(KEYS.opciones).filter((o) => o.id !== id));
  },
};

// Historial: las encuestas guardan docenteId + nombre/curso congelados
// para conservar la identidad del docente aunque luego se desactive o edite.
export function congelarDocente(docente, curso) {
  return {
    docenteId: docente.id,
    nombreCompleto: nombreDocente(docente),
    cursoNombre: curso ? curso.nombre : '—',
  };
}

export function nombreModalidad(modalidadId) {
  return MODALIDADES.find((m) => m.id === modalidadId)?.nombre || '—';
}

export const escalar = [
  { valor: 1, etiqueta: 'Nunca' },
  { valor: 2, etiqueta: 'Casi nunca' },
  { valor: 3, etiqueta: 'A veces' },
  { valor: 4, etiqueta: 'Casi siempre' },
  { valor: 5, etiqueta: 'Siempre' },
];

export const preguntas = [
  { id: 'p1', texto: '¿El docente asiste puntualmente a sus clases?' },
  { id: 'p2', texto: '¿El docente explica los temas con claridad?' },
  { id: 'p3', texto: '¿El docente demuestra dominio del tema que enseña?' },
  { id: 'p4', texto: '¿El docente resuelve las dudas de los alumnos?' },
  { id: 'p5', texto: '¿El docente utiliza ejemplos para explicar los temas?' },
  { id: 'p6', texto: '¿El docente trata a todos los alumnos con respeto?' },
  { id: 'p7', texto: '¿El docente escucha las opiniones de los alumnos?' },
  { id: 'p8', texto: '¿El docente mantiene el orden durante las clases?' },
  { id: 'p9', texto: '¿El docente utiliza adecuadamente el tiempo de clase?' },
  { id: 'p10', texto: '¿El docente comunica claramente las calificaciones?' },
  { id: 'p11', texto: '¿El docente evalúa de acuerdo con lo enseñado?' },
  { id: 'p12', texto: '¿El docente muestra disposición para ayudar a los alumnos?' },
];

// Nombre visible del docente. Compatible con registros antiguos guardados
// con los campos separados `nombres` y `apellidos`.
export function nombreDocente(d) {
  if (!d) return '—';
  return (d.nombre || [d.nombres, d.apellidos].filter(Boolean).join(' ')).trim() || '—';
}

// Modalidades que enseña un docente (compatible con el campo `modalidadId` antiguo).
export function modalidadesDe(d) {
  if (!d) return [];
  if (Array.isArray(d.modalidadIds)) return d.modalidadIds;
  return d.modalidadId ? [d.modalidadId] : [];
}
