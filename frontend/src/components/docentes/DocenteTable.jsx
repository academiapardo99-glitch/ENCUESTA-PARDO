import { MODALIDADES, nombreDocente, modalidadesDe } from '../../services/dataService.js';
import Icon, { ICONOS_MODALIDAD } from '../comunes/Icon.jsx';

export default function DocenteTable({ docentes, cursos, onEditar, onCambiarEstado, onEliminar, onOrdenar, orden }) {
  function nombreCurso(id) {
    const c = cursos.find((x) => x.id === id);
    return c ? c.nombre : '—';
  }

  return (
    <div className="tabla-envoltura">
      <table className="tabla">
        <thead>
          <tr>
            <th className="th-ordenable" onClick={onOrdenar} title="Ordenar alfabéticamente">
              Nombre {orden === 'asc' ? '▲' : orden === 'desc' ? '▼' : '↕'}
            </th>
            <th>Curso</th>
            <th>Modalidades que enseña</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {docentes.map((d) => (
            <tr key={d.id} className={d.estado === 'inactivo' ? 'fila-inactiva' : ''}>
              <td data-etiqueta="Nombre">{nombreDocente(d)}</td>
              <td data-etiqueta="Curso">{nombreCurso(d.cursoId)}</td>
              <td data-etiqueta="Modalidades">
                <div className="chips chips-inline">
                  {modalidadesDe(d).map((mid) => {
                    const m = MODALIDADES.find((x) => x.id === mid);
                    const estilo = ICONOS_MODALIDAD[mid] || { icon: 'escuela', color: '#1e4e8c' };
                    return m ? (
                      <span key={mid} className="chip chip-mini">
                        <Icon name={estilo.icon} size={13} color={estilo.color} /> {m.nombre}
                      </span>
                    ) : null;
                  })}
                  {modalidadesDe(d).length === 0 && '—'}
                </div>
              </td>
              <td data-etiqueta="Estado">
                <span className={`insignia ${d.estado === 'activo' ? 'insignia-verde' : 'insignia-gris'}`}>
                  {d.estado === 'activo' ? '● Activo' : '○ Inactivo'}
                </span>
              </td>
              <td data-etiqueta="Acciones" className="acciones">
                <button className="btn-icono" title="Editar" onClick={() => onEditar(d)}>
                  <Icon name="editar" size={17} />
                </button>
                <button
                  className="btn-icono"
                  title={d.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  onClick={() => onCambiarEstado(d)}
                >
                  <Icon name={d.estado === 'activo' ? 'desactivar' : 'activar'} size={17} />
                </button>
                <button className="btn-icono" title="Eliminar" onClick={() => onEliminar(d)}>
                  <Icon name="eliminar" size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
