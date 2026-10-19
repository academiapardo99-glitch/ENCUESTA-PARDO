import Icon, { ICONOS_MODALIDAD, ICONOS_GRUPO } from '../comunes/Icon.jsx';
import { GRUPOS_BASE } from '../../services/dataService.js';

// Paso 1 de la encuesta: el alumno se identifica por modalidad y grupo.
export default function SelectorModalidadGrupo({
  modalidades, grupos, seleccion, onCambiar, encuestas,
}) {
  const { modalidadId, grupoId } = seleccion;

  // Cada modalidad tiene exactamente sus 4 grupos (A, B, C, D).
  const gruposModalidad = GRUPOS_BASE
    .map((nombre) => grupos.find((g) => g.modalidadId === modalidadId && g.nombre === nombre))
    .filter(Boolean);
  const activos = gruposModalidad.filter((g) => g.activo);

  return (
    <div className="selector-mg">
      <div className="paso-titulo">
        <span className="paso-num">1</span>
        <div>
          <h3>¿A qué modalidad perteneces?</h3>
          <p>Selecciona tu modalidad de estudio y luego tu grupo.</p>
        </div>
      </div>

      <div className="grid-modalidades" role="radiogroup" aria-label="Modalidad de estudio">
        {modalidades.map((m) => {
          const estilo = ICONOS_MODALIDAD[m.id] || { icon: 'escuela', color: '#1e4e8c' };
          const activa = modalidadId === m.id;
          return (
            <button
              type="button"
              key={m.id}
              role="radio"
              aria-checked={activa}
              className={`modalidad-card ${activa ? 'modalidad-card-activa' : ''}`}
              onClick={() => onCambiar({ modalidadId: m.id, grupoId: '' })}
              style={activa ? { borderColor: estilo.color } : undefined}
            >
              <span className="modalidad-icono" style={{ color: estilo.color }}>
                <Icon name={estilo.icon} size={30} />
              </span>
              <span className="modalidad-nombre">{m.nombre}</span>
              <small>{m.descripcion}</small>
              {encuestas.filter((e) => e.modalidadId === m.id).length > 0 && (
                <span className="modalidad-contador">
                  {encuestas.filter((e) => e.modalidadId === m.id).length} respuestas
                </span>
              )}
            </button>
          );
        })}
      </div>

      {modalidadId && (
        <div className="paso-grupo">
          <div className="paso-titulo">
            <span className="paso-num">2</span>
            <div>
              <h3>Selecciona tu grupo</h3>
              <p>
                La modalidad <strong>{modalidades.find((m) => m.id === modalidadId)?.nombre}</strong>
                {' '}tiene {gruposModalidad.length} grupos.
              </p>
            </div>
          </div>

          {activos.length === 0 ? (
            <p className="alerta alerta-error">Esta modalidad no tiene grupos activos.</p>
          ) : (
            <div className="grid-grupos" role="radiogroup" aria-label="Grupo">
              {gruposModalidad.map((g) => {
                const activo = g.activo;
                const elegido = grupoId === g.id;
                return (
                  <button
                    type="button"
                    key={g.id}
                    role="radio"
                    aria-checked={elegido}
                    disabled={!activo}
                    className={`grupo-card ${elegido ? 'grupo-card-activo' : ''} ${!activo ? 'grupo-card-inactivo' : ''}`}
                    onClick={() => activo && onCambiar({ grupoId: g.id })}
                  >
                    <Icon name={ICONOS_GRUPO[g.nombre] || 'grupoE'} size={22} />
                    <strong>Grupo {g.nombre}</strong>
                    <small className={activo ? '' : 'error-texto'}>
                      {activo ? 'Disponible' : 'Inactivo'}
                    </small>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
