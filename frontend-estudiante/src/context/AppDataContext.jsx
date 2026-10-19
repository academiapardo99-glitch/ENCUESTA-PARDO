// ===== Fuente de datos compartida (única para toda la app) =====
// Toda la información proviene de la API REST; este contexto es la única capa
// que las páginas consumen.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  docentesService, cursosService, encuestasService, gruposService,
  MODALIDADES, GRUPOS_BASE,
} from '../services/dataService.js';
import { sincronizarInstrumento } from '../utils/instrumento.js';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [cursos, setCursos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [notificacion, setNotificacion] = useState(null); // { tipo, texto }

  const [errorCarga, setErrorCarga] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [cs, ds, gs] = await Promise.all([
        cursosService.listar(),
        docentesService.listar(),
        // El servidor garantiza siempre los 20 grupos (5 modalidades × A–D).
        gruposService.listar(),
      ]);
      setCursos(cs);
      setDocentes(ds);
      setGrupos(gs);
      // Preguntas y escala publicadas por el administrador en el panel de gestión.
      await sincronizarInstrumento(true);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const notificar = useCallback((tipo, texto) => {
    setNotificacion({ tipo, texto });
    setTimeout(() => setNotificacion(null), 3500);
  }, []);

  // ---- Cursos ----
  const agregarCurso = useCallback(async (datos) => {
    const c = await cursosService.crear(datos);
    setCursos(await cursosService.listar());
    notificar('exito', `Curso "${c.nombre}" agregado.`);
    return c;
  }, [notificar]);

  const actualizarCurso = useCallback(async (id, cambios) => {
    await cursosService.actualizar(id, cambios);
    setCursos(await cursosService.listar());
    notificar('exito', 'Curso actualizado.');
  }, [notificar]);

  // ---- Docentes ----
  const agregarDocente = useCallback(async (datos) => {
    const d = await docentesService.crear(datos);
    setDocentes(await docentesService.listar());
    notificar('exito', `Docente ${d.codigo} registrado correctamente.`);
    return d;
  }, [notificar]);

  const actualizarDocente = useCallback(async (id, cambios) => {
    await docentesService.actualizar(id, cambios);
    setDocentes(await docentesService.listar());
    notificar('exito', 'Docente actualizado correctamente.');
  }, [notificar]);

  const cambiarEstadoDocente = useCallback(async (id) => {
    const d = await docentesService.cambiarEstado(id);
    setDocentes(await docentesService.listar());
    notificar('info', `Docente ${d.codigo} ${d.estado === 'activo' ? 'activado' : 'desactivado'}.`);
  }, [notificar]);

  const eliminarDocente = useCallback(async (id) => {
    await docentesService.eliminar(id);
    setDocentes(await docentesService.listar());
    notificar('info', 'Docente eliminado.');
  }, [notificar]);

  // ---- Grupos (4 fijos por modalidad: A, B, C, D) ----
  const toggleGrupo = useCallback(async (id) => {
    const g = grupos.find((x) => x.id === id);
    if (!g) return;
    await gruposService.actualizar(id, { activo: !g.activo });
    setGrupos(await gruposService.listar());
    notificar('info', `Grupo ${g.nombre} ${g.activo ? 'desactivado' : 'activado'}.`);
  }, [grupos, notificar]);

  // ---- Encuestas ----
  const enviarEncuesta = useCallback(async (payload) => {
    const e = await encuestasService.crear(payload);
    notificar('exito', 'Encuesta enviada. ¡Gracias por su opinión!');
    return e;
  }, [notificar]);

  const value = {
    cursos, docentes, grupos, modalidades: MODALIDADES, gruposBase: GRUPOS_BASE,
    cargando, errorCarga, notificacion,
    notificar, cargar,
    agregarCurso, actualizarCurso,
    agregarDocente, actualizarDocente, cambiarEstadoDocente, eliminarDocente,
    toggleGrupo,
    enviarEncuesta,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData debe usarse dentro de AppDataProvider');
  return ctx;
}

// ---------- Helpers derivados ----------
export function nombreCurso(cursos, cursoId) {
  const c = cursos.find((x) => x.id === cursoId);
  return c ? c.nombre : '—';
}

export function promedioDocente(encuestas, docenteId) {
  const propias = encuestas.filter((e) => e.docenteId === docenteId);
  if (!propias.length) return null;
  const vals = propias.flatMap((e) => Object.values(e.respuestas).filter(Number.isFinite));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function promedioCurso(encuestas, docentes, cursoId) {
  const ids = docentes.filter((d) => d.cursoId === cursoId).map((d) => d.id);
  const propias = encuestas.filter((e) => ids.includes(e.docenteId));
  if (!propias.length) return null;
  const vals = propias.flatMap((e) => Object.values(e.respuestas).filter(Number.isFinite));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Promedio de un subconjunto de encuestas (por modalidad o por grupo).
export function promedioDeEncuestas(lista) {
  if (!lista.length) return null;
  const vals = lista.flatMap((e) => Object.values(e.respuestas).filter(Number.isFinite));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
