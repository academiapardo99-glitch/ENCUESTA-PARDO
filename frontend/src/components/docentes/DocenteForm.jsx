import { useState } from 'react';
import { validarDocente } from '../../utils/validaciones.js';
import { MODALIDADES, nombreDocente, modalidadesDe } from '../../services/dataService.js';
import Icon, { ICONOS_MODALIDAD } from '../comunes/Icon.jsx';

const VACIO = {
  nombre: '',
  cursoId: '',
  modalidadIds: [],
};

export default function DocenteForm({ docente, cursos, docentes, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState(
    docente
      ? {
          nombre: nombreDocente(docente),
          cursoId: docente.cursoId || '',
          modalidadIds: modalidadesDe(docente),
        }
      : VACIO
  );
  const [errores, setErrores] = useState({});

  const cursosActivos = cursos.filter((c) => c.activo);

  function alternarModalidad(id) {
    setDatos((d) => ({
      ...d,
      modalidadIds: d.modalidadIds.includes(id)
        ? d.modalidadIds.filter((m) => m !== id)
        : [...d.modalidadIds, id],
    }));
    if (errores.modalidadIds) setErrores((e) => ({ ...e, modalidadIds: undefined }));
  }

  function enviar(e) {
    e.preventDefault();
    const errs = validarDocente(datos, docentes, docente?.id ?? null);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    onGuardar(datos);
  }

  return (
    <form onSubmit={enviar} className="form" noValidate>
      <label className="campo">
        <span>Nombre del docente <em>*</em></span>
        <input
          value={datos.nombre}
          onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))}
          placeholder="Nombre completo del docente"
          className={errores.nombre ? 'input error' : 'input'}
          autoFocus
        />
        {errores.nombre && <small className="error-texto">{errores.nombre}</small>}
      </label>

      <label className="campo">
        <span>Curso <em>*</em></span>
        <select
          value={datos.cursoId}
          onChange={(e) => setDatos((d) => ({ ...d, cursoId: e.target.value }))}
          className={errores.cursoId ? 'input error' : 'input'}
        >
          <option value="">— Seleccione un curso —</option>
          {cursosActivos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {errores.cursoId && <small className="error-texto">{errores.cursoId}</small>}
      </label>

      <fieldset className="campo grupo-check">
        <legend>Modalidades que enseña <em>*</em></legend>
        <div className="grid-check">
          {MODALIDADES.map((m) => {
            const estilo = ICONOS_MODALIDAD[m.id] || { icon: 'escuela', color: '#1e4e8c' };
            const marcada = datos.modalidadIds.includes(m.id);
            return (
              <label key={m.id} className={`check-card ${marcada ? 'check-card-activa' : ''}`}>
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alternarModalidad(m.id)}
                />
                <span style={{ color: estilo.color }}><Icon name={estilo.icon} size={18} /></span>
                <span>{m.nombre}</span>
                {marcada && <Icon name="check" size={16} color="#1e4e8c" className="check-marca" />}
              </label>
            );
          })}
        </div>
        <small className="ayuda">Puede seleccionar una o varias modalidades.</small>
        {errores.modalidadIds && <small className="error-texto">{errores.modalidadIds}</small>}
      </fieldset>

      <div className="modal-acciones">
        <button type="button" className="btn btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primario">
          {docente ? 'Guardar cambios' : 'Registrar docente'}
        </button>
      </div>
    </form>
  );
}
