import { useState } from 'react';
import { validarCurso } from '../../utils/validaciones.js';
import { MODALIDADES } from '../../services/dataService.js';
import Icon, { ICONOS_MODALIDAD } from '../comunes/Icon.jsx';

// Formulario para crear/editar un curso: solo nombre + grupos a los que pertenece.
// Los grupos disponibles se agrupan por modalidad de estudio (Colegio, Primera Opción, etc.).
export default function CursoForm({ cursoInicial, cursos, grupos = [], onGuardar, onCancelar }) {
  const [datos, setDatos] = useState(
    cursoInicial
      ? { nombre: cursoInicial.nombre, grupoIds: cursoInicial.grupoIds || cursoInicial.modalidadIds || [] }
      : { nombre: '', grupoIds: [] }
  );
  const [errores, setErrores] = useState({});

  const set = (campo) => (e) => {
    const valor = e.target.value;
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const alternarGrupo = (id) => {
    setDatos((d) => ({
      ...d,
      grupoIds: d.grupoIds.includes(id)
        ? d.grupoIds.filter((g) => g !== id)
        : [...d.grupoIds, id],
    }));
  };

  const alternarModalidad = (modalidadId, marcar) => {
    const ids = grupos.filter((g) => g.modalidadId === modalidadId).map((g) => g.id);
    setDatos((d) => ({
      ...d,
      grupoIds: marcar
        ? [...new Set([...d.grupoIds, ...ids])]
        : d.grupoIds.filter((id) => !ids.includes(id)),
    }));
  };

  function enviar(e) {
    e.preventDefault();
    const errs = validarCurso(datos, cursos, cursoInicial?.id ?? null);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    onGuardar(datos);
  }

  return (
    <form onSubmit={enviar} className="form" noValidate>
      <label className="campo">
        <span>Nombre del curso <em>*</em></span>
        <input
          value={datos.nombre}
          onChange={set('nombre')}
          placeholder="Nombre del curso"
          className={errores.nombre ? 'input error' : 'input'}
        />
        {errores.nombre && <small className="error-texto">{errores.nombre}</small>}
      </label>
      <fieldset className="campo campo-fieldset">
        <legend>Grupos a los que pertenece el curso</legend>
        <p className="campo-ayuda">
          Marque los grupos en los que se dicta este curso. El curso quedará disponible
          para los docentes de esos grupos.
        </p>

        <div className="grupos-por-modalidad">
          {MODALIDADES.map((m) => {
            const estilo = ICONOS_MODALIDAD[m.id] || { icon: 'escuela', color: '#1e4e8c' };
            const delModalidad = grupos.filter((g) => g.modalidadId === m.id);
            if (delModalidad.length === 0) return null;
            const todos = delModalidad.every((g) => datos.grupoIds.includes(g.id));
            return (
              <div key={m.id} className="bloque-modalidad">
                <div className="bloque-modalidad-cabecera">
                  <span className="modalidad-icono chico" style={{ color: estilo.color }}>
                    <Icon name={estilo.icon} size={18} />
                  </span>
                  <strong>{m.nombre}</strong>
                  <button
                    type="button"
                    className="btn-enlace"
                    onClick={() => alternarModalidad(m.id, !todos)}
                  >
                    {todos ? 'Quitar todos' : 'Todos'}
                  </button>
                </div>
                <div className="chips-grupos">
                  {delModalidad.map((g) => {
                    const marcado = datos.grupoIds.includes(g.id);
                    return (
                      <label key={g.id} className={`chip-grupo ${marcado ? 'chip-grupo-activo' : ''}`}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarGrupo(g.id)}
                        />
                        <span>Grupo {g.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="modal-acciones">
        <button type="button" className="btn btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primario">
          {cursoInicial ? 'Guardar cambios' : 'Agregar curso'}
        </button>
      </div>
    </form>
  );
}
