import { Router } from 'express';
import { listarGrupos, actualizarGrupo } from '../modelos/grupos.js';

const router = Router();

// Siempre devuelve los 20 grupos (5 modalidades × 4 grupos A–D).
router.get('/', (req, res) => {
  res.json(listarGrupos());
});

router.patch('/:id', (req, res) => {
  const actualizado = actualizarGrupo(req.params.id, req.body || {});
  if (!actualizado) return res.status(404).json({ error: 'Grupo no encontrado.' });
  res.json(actualizado);
});

export default router;
