import { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';
import DocenteForm from '../components/docentes/DocenteForm.jsx';
import DocenteTable from '../components/docentes/DocenteTable.jsx';
import DocenteFilters from '../components/docentes/DocenteFilters.jsx';
import ConfirmDialog from '../components/comunes/ConfirmDialog.jsx';
import Icon from '../components/comunes/Icon.jsx';
import { nombreDocente, modalidadesDe } from '../services/dataService.js';

export default function DocentesPage() {
  const {
    docentes, cursos, encuestas, cargando,
    agregarDocente, actualizarDocente, cambiarEstadoDocente, eliminarDocente,
    notificar,
  } = useAppData();

  const [filtros, setFiltros] = useState({ busqueda: '', curso: '', modalidad: '', estado: '' });
  const [orden, setOrden] = useState('asc');
  const [modal, setModal] = useState(null); // { tipo: 'nuevo'|'editar', docente }
  const [confirmar, setConfirmar] = useState(null);

  const hayEncuestasDe = (id) => encuestas.some((e) => e.docenteId === id);

  const filtrados = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    let lista = docentes.filter((d) => {
      const curso = cursos.find((c) => c.id === d.cursoId);
      const texto = `${nombreDocente(d)} ${curso?.nombre || ''}`.toLowerCase();
      return (
        (!q || texto.includes(q)) &&
        (!filtros.curso || d.cursoId === filtros.curso) &&
        (!filtros.modalidad || modalidadesDe(d).includes(filtros.modalidad)) &&
        (!filtros.estado || d.estado === filtros.estado)
      );
    });
    lista = [...lista].sort((a, b) =>
      orden === 'asc'
        ? nombreDocente(a).localeCompare(nombreDocente(b), 'es')
        : nombreDocente(b).localeCompare(nombreDocente(a), 'es')
    );
    return lista;
  }, [docentes, cursos, filtros, orden]);

  async function guardar(datos) {
    try {
      if (modal.tipo === 'editar') await actualizarDocente(modal.docente.id, datos);
      else await agregarDocente(datos);
      setModal(null);
    } catch (err) {
      notificar('error', err.message);
    }
  }

  function pedirEliminar(docente) {
    if (hayEncuestasDe(docente.id)) {
      notificar(
        'error',
        `El docente ${nombreDocente(docente)} tiene encuestas históricas. Se recomienda desactivarlo para conservar los registros.`
      );
      return;
    }
    setConfirmar(docente);
  }

  return (
    <section className="pagina">
      <div className="pagina-cabecera">
        <h2><Icon name="docentes" size={22} /> Gestión de Docentes</h2>
        <button className="btn btn-primario" onClick={() => setModal({ tipo: 'nuevo' })}>
          <Icon name="mas" size={16} /> Agregar docente
        </button>
      </div>

      <DocenteFilters filtros={filtros} setFiltros={setFiltros} cursos={cursos} />

      {cargando ? (
        <p className="mensaje-vacio">Cargando docentes…</p>
      ) : docentes.length === 0 ? (
        <p className="mensaje-vacio">No hay docentes registrados. Agregue el primero con el botón «Agregar docente».</p>
      ) : filtrados.length === 0 ? (
        <p className="mensaje-vacio">La búsqueda no encontró resultados.</p>
      ) : (
        <DocenteTable
          docentes={filtrados}
          cursos={cursos}
          orden={orden}
          onOrdenar={() => setOrden((o) => (o === 'asc' ? 'desc' : 'asc'))}
          onEditar={(d) => setModal({ tipo: 'editar', docente: d })}
          onCambiarEstado={(d) => cambiarEstadoDocente(d.id)}
          onEliminar={pedirEliminar}
        />
      )}

      {modal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h3>{modal.tipo === 'editar' ? `Editar docente: ${nombreDocente(modal.docente)}` : 'Registrar nuevo docente'}</h3>
              <button className="btn-icono" onClick={() => setModal(null)} aria-label="Cerrar">
                <Icon name="cerrar" size={18} />
              </button>
            </div>
            <div className="modal-body">
              <DocenteForm
                docente={modal.tipo === 'editar' ? modal.docente : null}
                cursos={cursos}
                docentes={docentes}
                onGuardar={guardar}
                onCancelar={() => setModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {confirmar && (
        <ConfirmDialog
          titulo="Eliminar docente"
          mensaje={`¿Eliminar al docente ${nombreDocente(confirmar)}? Esta acción no se puede deshacer.`}
          onCancelar={() => setConfirmar(null)}
          onConfirmar={async () => {
            await eliminarDocente(confirmar.id);
            setConfirmar(null);
          }}
        />
      )}
    </section>
  );
}
