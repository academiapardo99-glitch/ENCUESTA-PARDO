import { Router } from 'express';
import {
  listarDocentes, crearDocente, actualizarDocente, eliminarDocente,
} from '../modelos/docentes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(listarDocentes());
});

router.post('/', async (req, res, next) => {
  try {
    const { nombre, cursoId, modalidadIds } = req.body || {};
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del docente es obligatorio.' });
    if (!cursoId) return res.status(400).json({ error: 'Debe seleccionar un curso.' });
    if (!Array.isArray(modalidadIds) || modalidadIds.length === 0) {
      return res.status(400).json({ error: 'Seleccione al menos una modalidad que enseña.' });
    }
    res.status(201).json(await crearDocente(req.body));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const actualizado = await actualizarDocente(req.params.id, req.body || {});
    if (!actualizado) return res.status(404).json({ error: 'Docente no encontrado.' });
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await eliminarDocente(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Docente no encontrado.' });
    // 200 en lugar de 204: el cliente debe leer una confirmación explícita.
    res.json({ ok: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
