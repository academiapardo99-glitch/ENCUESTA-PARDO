import { Router } from 'express';
import { listarEncuestas, crearEncuesta } from '../modelos/encuestas.js';
import { MODALIDADES, GRUPOS_BASE } from '../catalogo.js';
import { preguntasVigentes, obtenerInstrumento } from '../modelos/instrumento.js';
import { listarGrupos } from '../modelos/grupos.js';
import { listarDocentes } from '../modelos/docentes.js';
import { listarCursos } from '../modelos/cursos.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(listarEncuestas());
});

router.post('/', async (req, res, next) => {
  try {
  const { docenteId, cursoId, grupoId, respuestas } = req.body || {};
  if (!docenteId) return res.status(400).json({ error: 'Falta el docente a evaluar.' });
  if (!cursoId) return res.status(400).json({ error: 'Falta el curso.' });
  if (!grupoId) return res.status(400).json({ error: 'Falta el grupo.' });
  // Los ids deben existir realmente: evita valores como "undefined".
  if (!listarDocentes().some((d) => d.id === docenteId)) {
    return res.status(400).json({ error: 'El docente indicado no existe.' });
  }
  if (!listarCursos().some((c) => c.id === cursoId)) {
    return res.status(400).json({ error: 'El curso indicado no existe.' });
  }
  if (!listarGrupos().some((g) => g.id === grupoId)) {
    return res.status(400).json({ error: 'El grupo indicado no existe.' });
  }
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas) || Object.keys(respuestas).length === 0) {
    return res.status(400).json({ error: 'La encuesta no tiene respuestas.' });
  }
  // El diseño fijo manda: toda respuesta de escala es obligatoria y válida;
  // comentarios abiertos son opcionales y se limitan a su longitud definida.
  const vigentes = preguntasVigentes();
  const valoresEscala = new Set(obtenerInstrumento().escala.map((o) => o.valor));
  const faltantes = vigentes.filter((p) => p.obligatoria !== false && (respuestas[p.id] === undefined || respuestas[p.id] === null || respuestas[p.id] === ''));
  if (faltantes.length) {
    return res.status(400).json({ error: `Faltan ${faltantes.length} respuesta(s) obligatoria(s).` });
  }
  const idsVigentes = new Set(vigentes.map((p) => p.id));
  if (Object.keys(respuestas).some((id) => !idsVigentes.has(id))) {
    return res.status(400).json({ error: 'La encuesta contiene respuestas a preguntas que no existen.' });
  }
  const respuestasValidas = {};
  for (const pregunta of vigentes) {
    const valor = respuestas[pregunta.id];
    if (pregunta.tipo === 'texto') {
      if (valor === undefined || valor === null || valor === '') {
        respuestasValidas[pregunta.id] = '';
        continue;
      }
      if (typeof valor !== 'string') return res.status(400).json({ error: `La respuesta de texto para "${pregunta.texto}" no es válida.` });
      const texto = valor.trim();
      if (texto.length > (pregunta.maxLength || 500)) {
        return res.status(400).json({ error: `El comentario no puede superar ${pregunta.maxLength || 500} caracteres.` });
      }
      respuestasValidas[pregunta.id] = texto;
      continue;
    }
    if (typeof valor !== 'number' || !valoresEscala.has(valor)) {
      return res.status(400).json({ error: `Cada respuesta de escala debe estar entre ${Math.min(...valoresEscala)} y ${Math.max(...valoresEscala)}.` });
    }
    respuestasValidas[pregunta.id] = valor;
  }
  res.status(201).json(await crearEncuesta({ ...req.body, respuestas: respuestasValidas }));
  } catch (error) {
    next(error);
  }
});

// Catálogo de modalidades y grupos (útil para el frontend).
router.get('/catalogo', (req, res) => {
  res.json({ modalidades: MODALIDADES, gruposBase: GRUPOS_BASE });
});

export default router;
