export default function ConfirmDialog({ titulo = 'Confirmar', mensaje, onCancelar, onConfirmar }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <div className="modal modal-chico" role="alertdialog" aria-modal="true">
        <div className="modal-header">
          <h3>{titulo}</h3>
        </div>
        <div className="modal-body">
          <p>{mensaje}</p>
          <div className="modal-acciones">
            <button className="btn btn-secundario" onClick={onCancelar}>Cancelar</button>
            <button className="btn btn-peligro" onClick={onConfirmar}>Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
