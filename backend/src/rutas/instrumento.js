import { Router } from 'express';
import { obtenerInstrumento } from '../modelos/instrumento.js';

const router = Router();

// Instrumento fijo del backend (el mismo que valida las respuestas).
router.get('/', (req, res) => {
  res.json(obtenerInstrumento());
});

export default router;
