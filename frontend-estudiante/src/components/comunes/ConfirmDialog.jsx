export default function ConfirmDialog({
  titulo = 'Confirmar', mensaje, onCancelar, onConfirmar,
  confirmarTexto = 'Eliminar', confirmando = false,
}) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => !confirmando && e.target === e.currentTarget && onCancelar()}>
      <div className="modal modal-chico" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="modal-header">
          <h3 id="confirm-dialog-title">{titulo}</h3>
        </div>
        <div className="modal-body">
          <p>{mensaje}</p>
          <div className="modal-acciones">
            <button className="btn btn-secundario" onClick={onCancelar} disabled={confirmando}>Cancelar</button>
            <button className={`btn ${confirmarTexto === 'Eliminar' ? 'btn-peligro' : 'btn-primario'}`} onClick={onConfirmar} disabled={confirmando}>
              {confirmando ? 'Enviando…' : confirmarTexto}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
