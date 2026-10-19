import { useState } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';
import CursoFormModal from '../components/cursos/CursoFormModal.jsx';
import Icon from '../components/comunes/Icon.jsx';

export default function CursosPage() {
  const { cursos, docentes, grupos, agregarCurso, actualizarCurso, notificar } = useAppData();
  const [modal, setModal] = useState(null); // null | { curso } | 'nuevo'

  function guardar(datos) {
    if (modal === 'nuevo') agregarCurso(datos).then(() => setModal(null));
    else actualizarCurso(modal.curso.id, datos).then(() => setModal(null));
  }

  function toggleActivo(curso) {
    const enUso = docentes.some((d) => d.cursoId === curso.id && d.estado === 'activo');
    if (curso.activo && enUso) {
      notificar('error', `El curso "${curso.nombre}" tiene docentes activos. Desasígnelos primero.`);
      return;
    }
    actualizarCurso(curso.id, { activo: !curso.activo });
  }

  return (
    <section className="pagina">
      <div className="pagina-cabecera">
        <h2><Icon name="libro" size={22} /> Catálogo de Cursos</h2>
        <button className="btn btn-primario" onClick={() => setModal('nuevo')}>
          <Icon name="mas" size={16} /> Nuevo curso
        </button>
      </div>

      {cursos.length === 0 ? (
        <p className="mensaje-vacio">No hay cursos registrados. Cree el primero para poder asignar docentes.</p>
      ) : (
        <div className="tarjetas-cursos">
          {cursos.map((c) => (
            <div key={c.id} className={`tarjeta-curso ${c.activo ? '' : 'tarjeta-curso-inactiva'}`}>
              <div className="tarjeta-curso-cabecera">
                <h4>{c.nombre}</h4>
                <span className={`insignia ${c.activo ? 'insignia-verde' : 'insignia-gris'}`}>
                  {c.activo ? '● Activo' : '○ Inactivo'}
                </span>
              </div>
              {c.grupoIds?.length > 0 && (
                <p className="tarjeta-curso-desc">
                  Grupos:{' '}
                  {c.grupoIds
                    .map((id) => grupos.find((g) => g.id === id))
                    .filter(Boolean)
                    .map((g) => g.nombre)
                    .join(', ')}
                </p>
              )}
              <p className="tarjeta-curso-desc">
                {docentes.filter((d) => d.cursoId === c.id).length} docente(s) asignado(s)
              </p>
              <div className="modal-acciones">
                <button className="btn btn-secundario" onClick={() => setModal({ curso: c })}>
                  <Icon name="editar" size={15} /> Editar
                </button>
                <button className="btn btn-secundario" onClick={() => toggleActivo(c)}>
                  <Icon name={c.activo ? 'desactivar' : 'activar'} size={15} />
                  {c.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CursoFormModal
          curso={modal === 'nuevo' ? null : modal.curso}
          cursos={cursos}
          grupos={grupos}
          onGuardar={guardar}
          onCerrar={() => setModal(null)}
        />
      )}
    </section>
  );
}
