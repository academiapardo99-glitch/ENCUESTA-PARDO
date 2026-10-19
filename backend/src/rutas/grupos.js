import { Router } from 'express';
import { listarGrupos, actualizarGrupo } from '../modelos/grupos.js';

const router = Router();

// Siempre devuelve los 20 grupos (5 modalidades × 4 grupos A–D).
router.get('/', async (req, res, next) => {
  try {
    res.json(await listarGrupos());
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const actualizado = await actualizarGrupo(req.params.id, req.body || {});
    if (!actualizado) return res.status(404).json({ error: 'Grupo no encontrado.' });
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
});

export default router;
