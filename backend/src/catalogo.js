// ===== Catálogo académico =====
// Cada modalidad agrupa a los alumnos en los grupos fijos A, B, C y D.
export const MODALIDADES = [
  { id: 'colegio', nombre: 'Colegio', icono: 'escuela', descripcion: 'Alumnos que provienen del nivel secundario' },
  { id: 'primera', nombre: 'Primera Opción', icono: 'estrella', descripcion: 'Postulantes que eligen esta carrera como primera opción' },
  { id: 'primera-avanzado', nombre: 'Primera Opción Avanzado', icono: 'tendencia', descripcion: 'Postulantes de Primera Opción con preparación avanzada' },
  { id: 'ordinario', nombre: 'Ordinario', icono: 'universidad', descripcion: 'Admisión en el examen ordinario' },
  { id: 'cepu', nombre: 'Ordinario Cepru', icono: 'verificado', descripcion: 'Centro de Estudios Preuniversitarios' },
];

// Todos los grados de cada modalidad se dividen siempre en estos 4 grupos.
export const GRUPOS_BASE = ['A', 'B', 'C', 'D'];

// Combinación modalidad × grupo: 5 × 4 = 20 grupos.
export function gruposPorDefecto() {
  const lista = [];
  for (const m of MODALIDADES) {
    for (const nombre of GRUPOS_BASE) {
      lista.push({ modalidadId: m.id, nombre, activo: true });
    }
  }
  return lista;
}

// Normaliza la colección de grupos dejando EXACTAMENTE un grupo por
// modalidad × grupo. Conserva ids y estados existentes, y elimina duplicados
// o grupos de modalidades que ya no existen.
export function sincronizarGrupos(grupos) {
  const esperados = gruposPorDefecto();
  const usados = new Set();
  const resultado = [];

  for (const e of esperados) {
    const existentes = grupos.filter(
      (g) => g.modalidadId === e.modalidadId && g.nombre === e.nombre && !usados.has(g.id)
    );
    const base = existentes[0];
    if (base) {
      // Un registro heredado puede no tener id: se le asigna uno nuevo para
      // que la colección siempre tenga ids únicos y válidos.
      const id = base.id || nuevoIdSeguro();
      usados.add(id);
      resultado.push({ ...base, id, activo: base.activo !== false });
    } else {
      resultado.push({
        id: nuevoIdSeguro(),
        modalidadId: e.modalidadId,
        nombre: e.nombre,
        activo: true,
        creadoEn: new Date().toISOString(),
      });
    }
  }
  return resultado;
}

function nuevoIdSeguro() {
  return globalThis.crypto?.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ===== Instrumento fijo de evaluación docente =====
// La definición canónica vive en el backend; no se carga ni se reemplaza desde
// el archivo de datos. Las dos preguntas de comentario son opcionales.
export const ESCALA_POR_DEFECTO = [
  { valor: 1, etiqueta: 'Nunca' },
  { valor: 2, etiqueta: 'Casi nunca' },
  { valor: 3, etiqueta: 'Muy pocas veces' },
  { valor: 4, etiqueta: 'Pocas veces' },
  { valor: 5, etiqueta: 'Algunas veces' },
  { valor: 6, etiqueta: 'A veces' },
  { valor: 7, etiqueta: 'Frecuentemente' },
  { valor: 8, etiqueta: 'Casi siempre' },
  { valor: 9, etiqueta: 'Siempre' },
  { valor: 10, etiqueta: 'Siempre, de manera excelente' },
];

export const SECCIONES_INSTRUMENTO = [
  { id: 'dominio-tema', titulo: 'Dominio del tema', descripcion: 'Claridad y seguridad al explicar los contenidos.' },
  { id: 'desarrollo-ejercicios', titulo: 'Desarrollo de ejercicios', descripcion: 'Procedimientos, estrategias y práctica guiada.' },
  { id: 'preparacion-admision', titulo: 'Preparación para el examen de admisión', descripcion: 'Práctica enfocada en el examen de admisión.' },
  { id: 'desarrollo-clases', titulo: 'Desarrollo de las clases', descripcion: 'Organización, ritmo y uso del tiempo.' },
  { id: 'responsabilidad-puntualidad', titulo: 'Responsabilidad y puntualidad', descripcion: 'Cumplimiento del horario y preparación de la clase.' },
  { id: 'trato-alumnos', titulo: 'Trato hacia los alumnos', descripcion: 'Respeto, escucha y trato justo.' },
  { id: 'comentario-sugerencias', titulo: 'Comentario y sugerencias', descripcion: 'Comparte una sugerencia y aquello que valoras.' },
];

const textosEscala = [
  ['dominio-tema', [
    '¿El profesor demuestra que conoce bien los temas que desarrolla?',
    '¿Explica los temas de una manera que puedes entender?',
    '¿Responde con claridad cuando un alumno le hace una pregunta?',
    '¿Explica por qué una respuesta es correcta y las demás no?',
  ]],
  ['desarrollo-ejercicios', [
    '¿Resuelve los ejercicios correctamente en la pizarra?',
    '¿Explica cómo llegar a la respuesta y no solo da el resultado?',
    '¿Enseña diferentes formas de resolver un mismo ejercicio cuando es posible?',
    '¿Desarrolla ejercicios que te ayudan a entender mejor los temas?',
  ]],
  ['preparacion-admision', [
    '¿Los ejercicios que desarrolla te ayudan a prepararte para el examen de admisión?',
    '¿Enseña trucos o métodos que permiten resolver preguntas en menos tiempo?',
    '¿Practica preguntas parecidas a las que vienen en los exámenes de admisión?',
    '¿Explica cómo resolver los ejercicios más difíciles?',
  ]],
  ['desarrollo-clases', [
    '¿El profesor aprovecha el tiempo de clase para enseñar?',
    '¿Desarrolla los temas en un orden que facilita el aprendizaje?',
    '¿Dedica tiempo a explicar los ejercicios que los alumnos no entienden?',
    '¿Mantiene un buen ritmo de enseñanza sin avanzar demasiado rápido?',
  ]],
  ['responsabilidad-puntualidad', [
    '¿El profesor llega puntualmente a sus clases?',
    '¿Cumple con el horario establecido?',
    '¿Llega preparado para desarrollar su clase?',
    '¿Cumple con los temas que le corresponde enseñar?',
  ]],
  ['trato-alumnos', [
    '¿El profesor trata con respeto a sus alumnos?',
    '¿Puedes preguntarle cuando no entiendes un tema sin sentirte incómodo?',
    '¿Escucha las preguntas de los alumnos sin molestarse?',
    '¿Trata a todos los alumnos de manera justa?',
  ]],
];

export const PREGUNTAS_POR_DEFECTO = textosEscala.flatMap(([seccion, textos]) =>
  textos.map((texto, i) => ({
    id: `${seccion}-${i + 1}`,
    seccion,
    tipo: 'escala',
    texto,
    obligatoria: true,
  }))
).concat([
  { id: 'comentario-mejora', seccion: 'comentario-sugerencias', tipo: 'texto', texto: '¿Qué aspecto debería mejorar el docente?', obligatoria: false, maxLength: 500 },
  { id: 'comentario-valora', seccion: 'comentario-sugerencias', tipo: 'texto', texto: '¿Qué es lo que más valoras de este docente?', obligatoria: false, maxLength: 500 },
]);

export const INSTRUMENTO_POR_DEFECTO = {
  titulo: 'Encuesta de Evaluación Docente',
  subtitulo: 'Evalúa tu experiencia en clase. Las respuestas de escala son obligatorias; los comentarios son opcionales.',
  secciones: SECCIONES_INSTRUMENTO,
  escala: ESCALA_POR_DEFECTO,
  preguntas: PREGUNTAS_POR_DEFECTO,
};

// Valores admitidos en una respuesta de encuesta (derivados de la escala).
export const VALORES_ESCALA = ESCALA_POR_DEFECTO.map((o) => o.valor);
