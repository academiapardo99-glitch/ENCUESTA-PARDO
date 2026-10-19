import { Router } from 'express';
import {
  listarDocentes, crearDocente, actualizarDocente, eliminarDocente,
} from '../modelos/docentes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(listarDocentes());
});

router.post('/', (req, res) => {
  const { nombre, cursoId, modalidadIds } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del docente es obligatorio.' });
  if (!cursoId) return res.status(400).json({ error: 'Debe seleccionar un curso.' });
  if (!Array.isArray(modalidadIds) || modalidadIds.length === 0) {
    return res.status(400).json({ error: 'Seleccione al menos una modalidad que enseña.' });
  }
  res.status(201).json(crearDocente(req.body));
});

router.put('/:id', (req, res) => {
  const actualizado = actualizarDocente(req.params.id, req.body || {});
  if (!actualizado) return res.status(404).json({ error: 'Docente no encontrado.' });
  res.json(actualizado);
});

router.delete('/:id', (req, res) => {
  const ok = eliminarDocente(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Docente no encontrado.' });
  // 200 en lugar de 204: el cliente debe leer una confirmación explícita.
  res.json({ ok: true, id: req.params.id });
});

export default router;
