import { Router } from 'express';
import {
  listarCursos, crearCurso, actualizarCurso, eliminarCurso,
} from '../modelos/cursos.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(listarCursos());
});

router.post('/', (req, res) => {
  const { nombre, grupoIds } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del curso es obligatorio.' });
  if (!Array.isArray(grupoIds) || grupoIds.length === 0) {
    return res.status(400).json({ error: 'Seleccione al menos un grupo.' });
  }
  res.status(201).json(crearCurso(req.body));
});

router.put('/:id', (req, res) => {
  const actualizado = actualizarCurso(req.params.id, req.body || {});
  if (!actualizado) return res.status(404).json({ error: 'Curso no encontrado.' });
  res.json(actualizado);
});

router.delete('/:id', (req, res) => {
  const ok = eliminarCurso(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Curso no encontrado.' });
  res.status(204).end();
});

export default router;
