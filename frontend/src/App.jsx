import { useState } from 'react';
import { AppDataProvider, useAppData } from './context/AppDataContext.jsx';
import Icon from './components/comunes/Icon.jsx';
import DocentesPage from './pages/DocentesPage.jsx';
import CursosPage from './pages/CursosPage.jsx';
import EncuestasPage from './pages/EncuestasPage.jsx';
import EncuestaDisenoPage from './pages/EncuestaDisenoPage.jsx';
import Estadisticas from './pages/Estadisticas.jsx';
import PresentacionPage from './pages/PresentacionPage.jsx';

const PAGINAS = [
  { id: 'docentes', icono: 'docentes', etiqueta: 'Docentes', componente: DocentesPage },
  { id: 'cursos', icono: 'libro', etiqueta: 'Cursos', componente: CursosPage },
  { id: 'grupos', icono: 'grupoA', etiqueta: 'Modalidades', componente: () => <Estadisticas vistaInicial="grupo" /> },
  { id: 'diseno', icono: 'editar', etiqueta: 'Diseño de encuesta', componente: EncuestaDisenoPage },
  { id: 'encuestas', icono: 'encuesta', etiqueta: 'Encuestas', componente: EncuestasPage },
  { id: 'estadisticas', icono: 'grafico', etiqueta: 'Estadísticas', componente: Estadisticas },
  { id: 'presentacion', icono: 'online', etiqueta: 'Presentación', componente: PresentacionPage },
];

function Notificacion() {
  const { notificacion } = useAppData();
  if (!notificacion) return null;
  return (
    <div className={`notificacion notificacion-${notificacion.tipo}`} role="status">
      <Icon name={notificacion.tipo === 'exito' ? 'verificado' : notificacion.tipo === 'error' ? 'alerta' : 'encuesta'} size={18} />
      <span>{notificacion.texto}</span>
    </div>
  );
}

function Contenido() {
  const [pagina, setPagina] = useState('docentes');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { cargando, errorCarga, cargar } = useAppData();
  const Pagina = PAGINAS.find((p) => p.id === pagina).componente;

  if (cargando) {
    return <div className="cargando-global">Cargando el sistema…</div>;
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
    <div className="layout">
      <aside className={`sidebar ${menuAbierto ? 'sidebar-abierta' : ''}`}>
        <div className="sidebar-marca">
          <span className="sidebar-logo"><Icon name="escuela" size={30} color="#fff" /></span>
          <span className="sidebar-nombre">SGE<br /><small>Gestión Docente</small></span>
        </div>
        <nav className="sidebar-nav">
          {PAGINAS.map((p) => (
            <button
              key={p.id}
              className={`sidebar-item ${pagina === p.id ? 'sidebar-item-activo' : ''}`}
              onClick={() => { setPagina(p.id); setMenuAbierto(false); }}
            >
              <Icon name={p.icono} size={19} /> {p.etiqueta}
            </button>
          ))}
        </nav>
        <p className="sidebar-pie">Panel administrativo</p>
      </aside>

      <div className="principal">
        <header className="encabezado">
          <button
            className="btn-hamburguesa"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" size={22} />
          </button>
          <h1>Sistema de Gestión y Evaluación de Docentes</h1>
        </header>
        <main className="contenido">
          <Pagina />
        </main>
      </div>

      <Notificacion />
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <Contenido />
    </AppDataProvider>
  );
}
