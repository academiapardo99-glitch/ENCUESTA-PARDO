// Espejo del instrumento fijo que expone GET /api/instrumento.
import { instrumentoService } from '../services/dataService.js';

export const SECCIONES_POR_DEFECTO = [
  { id: 'dominio-tema', titulo: 'Dominio del tema', descripcion: 'Claridad y seguridad al explicar los contenidos.' },
  { id: 'desarrollo-ejercicios', titulo: 'Desarrollo de ejercicios', descripcion: 'Procedimientos, estrategias y práctica guiada.' },
  { id: 'preparacion-admision', titulo: 'Preparación para el examen de admisión', descripcion: 'Práctica enfocada en el examen de admisión.' },
  { id: 'desarrollo-clases', titulo: 'Desarrollo de las clases', descripcion: 'Organización, ritmo y uso del tiempo.' },
  { id: 'responsabilidad-puntualidad', titulo: 'Responsabilidad y puntualidad', descripcion: 'Cumplimiento del horario y preparación de la clase.' },
  { id: 'trato-alumnos', titulo: 'Trato hacia los alumnos', descripcion: 'Respeto, escucha y trato justo.' },
  { id: 'comentario-sugerencias', titulo: 'Comentario y sugerencias', descripcion: 'Comparte una sugerencia y aquello que valoras.' },
];

const porSeccion = [
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

export const PREGUNTAS_POR_DEFECTO = porSeccion.flatMap(([seccion, lista]) => lista.map((texto, i) => ({
  id: `${seccion}-${i + 1}`, seccion, tipo: 'escala', texto, obligatoria: true,
}))).concat([
  { id: 'comentario-mejora', seccion: 'comentario-sugerencias', tipo: 'texto', texto: '¿Qué aspecto debería mejorar el docente?', obligatoria: false, maxLength: 500 },
  { id: 'comentario-valora', seccion: 'comentario-sugerencias', tipo: 'texto', texto: '¿Qué es lo que más valoras de este docente?', obligatoria: false, maxLength: 500 },
]);

export const ESCALA_POR_DEFECTO = [
  { valor: 1, etiqueta: 'Nunca' }, { valor: 2, etiqueta: 'Casi nunca' },
  { valor: 3, etiqueta: 'Muy pocas veces' }, { valor: 4, etiqueta: 'Pocas veces' },
  { valor: 5, etiqueta: 'Algunas veces' }, { valor: 6, etiqueta: 'A veces' },
  { valor: 7, etiqueta: 'Frecuentemente' }, { valor: 8, etiqueta: 'Casi siempre' },
  { valor: 9, etiqueta: 'Siempre' }, { valor: 10, etiqueta: 'Siempre, de manera excelente' },
];
export const TITULO_POR_DEFECTO = 'Encuesta de Evaluación Docente';
export const SUBTITULO_POR_DEFECTO = 'Evalúa tu experiencia en clase. Las respuestas de escala son obligatorias; los comentarios son opcionales.';
export const preguntas = [...PREGUNTAS_POR_DEFECTO];
export const escalar = ESCALA_POR_DEFECTO.map((o) => ({ ...o }));
export const secciones = SECCIONES_POR_DEFECTO.map((s) => ({ ...s }));
export const textos = { titulo: TITULO_POR_DEFECTO, subtitulo: SUBTITULO_POR_DEFECTO };
export const tituloEncuesta = () => textos.titulo;
export const subtituloEncuesta = () => textos.subtitulo;

export function normalizarEscala(lista) {
  const base = Array.isArray(lista) && lista.length ? lista : ESCALA_POR_DEFECTO;
  return base.map((o, i) => ({ valor: i + 1, etiqueta: String(o?.etiqueta ?? '').trim() || `Opción ${i + 1}` }));
}

export function normalizarPreguntas(lista) {
  if (!Array.isArray(lista) || !lista.length) return PREGUNTAS_POR_DEFECTO.map((p) => ({ ...p }));
  return lista.filter((p) => String(p?.texto ?? '').trim()).map((p) => ({
    id: String(p.id), seccion: p.seccion || '', tipo: p.tipo === 'texto' ? 'texto' : 'escala',
    texto: String(p.texto).trim(), obligatoria: p.obligatoria !== false,
    ...(p.maxLength ? { maxLength: Number(p.maxLength) } : {}),
  }));
}

export function aplicarInstrumento(diseno) {
  const nuevo = {
    titulo: String(diseno?.titulo ?? '').trim() || TITULO_POR_DEFECTO,
    subtitulo: String(diseno?.subtitulo ?? '').trim() || SUBTITULO_POR_DEFECTO,
    escala: normalizarEscala(diseno?.escala),
    secciones: Array.isArray(diseno?.secciones) && diseno.secciones.length ? diseno.secciones : SECCIONES_POR_DEFECTO,
    preguntas: normalizarPreguntas(diseno?.preguntas),
  };
  textos.titulo = nuevo.titulo;
  textos.subtitulo = nuevo.subtitulo;
  preguntas.splice(0, preguntas.length, ...nuevo.preguntas);
  escalar.splice(0, escalar.length, ...nuevo.escala);
  secciones.splice(0, secciones.length, ...nuevo.secciones.map((s) => ({ ...s })));
  return nuevo;
}

let sincronizado = null;
export function sincronizarInstrumento(forzar = false) {
  if (sincronizado && !forzar) return sincronizado;
  sincronizado = instrumentoService.obtener().then(aplicarInstrumento).catch(() => aplicarInstrumento(null));
  return sincronizado;
}
