import { Router } from 'express';
import {
  listarCursos, crearCurso, actualizarCurso, eliminarCurso,
} from '../modelos/cursos.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(listarCursos());
});

router.post('/', async (req, res, next) => {
  try {
    const { nombre, grupoIds } = req.body || {};
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del curso es obligatorio.' });
    if (!Array.isArray(grupoIds) || grupoIds.length === 0) {
      return res.status(400).json({ error: 'Seleccione al menos un grupo.' });
    }
    res.status(201).json(await crearCurso(req.body));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const actualizado = await actualizarCurso(req.params.id, req.body || {});
    if (!actualizado) return res.status(404).json({ error: 'Curso no encontrado.' });
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const resultado = await eliminarCurso(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Curso no encontrado.' });
    // 200 en lugar de 204 por el mismo motivo que el DELETE de docentes.
    res.json({ ok: true, id: req.params.id, ...resultado });
  } catch (error) {
    next(error);
  }
});

export default router;
