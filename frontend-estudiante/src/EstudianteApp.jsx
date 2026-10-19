import { AppDataProvider, useAppData } from './context/AppDataContext.jsx';
import Icon from './components/comunes/Icon.jsx';
import EncuestaEstudiantePage from './pages/EncuestaEstudiantePage.jsx';

function Notificacion() {
  const { notificacion } = useAppData();
  if (!notificacion) return null;
  return (
    <div className={`notificacion notificacion-${notificacion.tipo}`} role="status">
      <Icon
        name={notificacion.tipo === 'exito' ? 'verificado' : notificacion.tipo === 'error' ? 'alerta' : 'encuesta'}
        size={18}
      />
      <span>{notificacion.texto}</span>
    </div>
  );
}

function Contenido() {
  const { cargando, errorCarga, cargar } = useAppData();

  if (cargando) {
    return <div className="cargando-global">Cargando la encuesta…</div>;
  }

  if (errorCarga) {
    return (
      <div className="error-conexion">
        <Icon name="alerta" size={40} color="#c0392b" />
        <h2>No se pudo conectar con el servidor</h2>
        <p>{errorCarga}</p>
        <p className="error-conexion-ayuda">
          Asegúrese de que la API esté en ejecución (<code>npm run dev</code> en la carpeta <code>backend</code>).
        </p>
        <button className="btn btn-primario" onClick={cargar}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="layout-estudiante">
      <header className="encabezado encabezado-estudiante">
        <div className="marca-estudiante">
          <span className="sidebar-logo"><Icon name="escuela" size={30} color="#fff" /></span>
          <div>
            <h1>Encuesta de Evaluación Docente</h1>
            <p>Portal del estudiante</p>
          </div>
        </div>
      </header>
      <main className="contenido">
        <EncuestaEstudiantePage />
      </main>
      <Notificacion />
    </div>
  );
}

export default function EstudianteApp() {
  return (
    <AppDataProvider>
      <Contenido />
    </AppDataProvider>
  );
}
