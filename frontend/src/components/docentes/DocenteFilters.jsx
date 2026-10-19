import { MODALIDADES } from '../../services/dataService.js';

export default function DocenteFilters({ filtros, setFiltros, cursos }) {
  const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <div className="filtros">
      <input
        className="input buscador"
        placeholder="🔍 Buscar por nombre o curso…"
        value={filtros.busqueda}
        onChange={set('busqueda')}
      />
      <select className="input" value={filtros.curso} onChange={set('curso')}>
        <option value="">Todos los cursos</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <select className="input" value={filtros.modalidad} onChange={set('modalidad')}>
        <option value="">Todas las modalidades</option>
        {MODALIDADES.map((m) => (
          <option key={m.id} value={m.id}>{m.nombre}</option>
        ))}
      </select>
      <select className="input" value={filtros.estado} onChange={set('estado')}>
        <option value="">Todos los estados</option>
        <option value="activo">Activos</option>
        <option value="inactivo">Inactivos</option>
      </select>
      <button
        className="btn btn-secundario"
        onClick={() => setFiltros({ busqueda: '', curso: '', modalidad: '', estado: '' })}
      >
        Limpiar
      </button>
    </div>
  );
}
