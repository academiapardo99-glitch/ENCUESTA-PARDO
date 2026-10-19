import { useState } from 'react';
import Modal from '../comunes/Modal.jsx';
import CursoForm from './CursoForm.jsx';

export default function CursoFormModal({ curso, cursos, grupos, onGuardar, onCerrar }) {
  return (
    <Modal titulo={curso ? 'Editar curso' : 'Nuevo curso'} onCerrar={onCerrar}>
      <CursoForm
        cursoInicial={curso}
        cursos={cursos}
        grupos={grupos}
        onGuardar={onGuardar}
        onCancelar={onCerrar}
      />
    </Modal>
  );
}
