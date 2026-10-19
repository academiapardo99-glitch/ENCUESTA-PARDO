import { useMemo, useState } from 'react';
import { useAppData, nombreCurso } from '../context/AppDataContext.jsx';
import { MODALIDADES, nombreDocente, preguntas, secciones, escalar } from '../services/dataService.js';
import Icon from '../components/comunes/Icon.jsx';

const COLORES_ESCALA = ['#a63f47', '#be6258', '#cd7961', '#d18b55', '#c89c45', '#93a34d', '#61a179', '#3c927f', '#347e91', '#315f9d'];
const RESPUESTAS_MINIMAS_COMENTARIOS = 5;

function promedio(valores) {
  const datos = valores.filter(Number.isFinite);
  return datos.length ? datos.reduce((total, valor) => total + valor, 0) / datos.length : null;
}

function promedioEncuestaConInstrumento(encuesta) {
  return promedio(preguntas.filter((p) => p.tipo !== 'texto').map((p) => encuesta.respuestas?.[p.id]));
}

function Kpi({ icono, titulo, valor, detalle, tono = '' }) {
  return (
    <article className={`dash-kpi ${tono}`}>
      <span className="dash-kpi-icono"><Icon name={icono} size={19} /></span>
      <div className="dash-kpi-contenido"><span>{titulo}</span><strong>{valor}</strong><small>{detalle}</small></div>
    </article>
  );
}

function GraficoSecciones({ datos }) {
  return (
      <div className="dash-barras-seccion" role="img" aria-label="Promedio de evaluación por sección, escala de uno a diez">
      {datos.map((item) => (
        <div className="dash-barra-fila" key={item.id}>
          <div className="dash-barra-etiqueta"><span>{item.titulo}</span><strong>{item.promedio == null ? '—' : item.promedio.toFixed(2)}</strong></div>
          <div className="dash-barra-fondo"><span style={{ width: `${((item.promedio || 0) / 10) * 100}%` }} /></div>
          <small>{item.respuestas} valoraciones</small>
        </div>
      ))}
    </div>
  );
}

function GraficoDistribucion({ datos, total }) {
  return (
    <div className="dash-distribucion">
      <div className="dash-apilada" role="img" aria-label="Distribución de respuestas por nivel">
        {datos.map((item) => (
          <span key={item.valor} style={{ width: `${total ? (item.cantidad / total) * 100 : 0}%`, background: item.color }} title={`${item.etiqueta}: ${item.cantidad} respuestas`} />
        ))}
      </div>
      <div className="dash-leyenda">
        {datos.map((item) => (
          <div key={item.valor}><i style={{ background: item.color }} /><span><strong>{item.valor}</strong> {item.etiqueta}</span><b>{total ? Math.round((item.cantidad / total) * 100) : 0}%</b></div>
        ))}
      </div>
    </div>
  );
}

function GraficoTendencia({ datos }) {
  if (!datos.length) return <div className="dash-vacio">Aún no hay respuestas del instrumento actual para mostrar una tendencia.</div>;
  const width = 640;
  const height = 220;
  const pad = { top: 18, right: 24, bottom: 36, left: 32 };
  const x = (i) => pad.left + (datos.length === 1 ? (width - pad.left - pad.right) / 2 : i * (width - pad.left - pad.right) / (datos.length - 1));
  const y = (v) => pad.top + ((10 - v) / 10) * (height - pad.top - pad.bottom);
  const path = datos.map((d, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(d.promedio)}`).join(' ');
  return (
    <div className="dash-tendencia-wrap">
      <svg className="dash-tendencia" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia mensual del promedio de las preguntas de escala">
        <defs><linearGradient id="dash-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4d88c6" /><stop offset="100%" stopColor="#fff" /></linearGradient></defs>
        {[0, 2, 4, 6, 8, 10].map((v) => <g key={v}><line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} /><text x={pad.left - 10} y={y(v) + 4}>{v}</text></g>)}
        <path className="dash-tendencia-area" d={`${path} L ${x(datos.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`} />
        <path className="dash-tendencia-linea" d={path} />
        {datos.map((d, i) => <g key={d.mes}><circle cx={x(i)} cy={y(d.promedio)} r="4.5" /><text className="dash-tendencia-mes" x={x(i)} y={height - 10}>{d.etiqueta}</text></g>)}
      </svg>
      <p className="dash-chart-nota">Promedio mensual de las respuestas numéricas del instrumento vigente.</p>
    </div>
  );
}

function SelectFiltro({ etiqueta, valor, onChange, opciones, todos = 'Todos' }) {
  return (
    <label className="dash-filtro"><span>{etiqueta}</span><select className="input" value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">{todos}</option>{opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
    </select></label>
  );
}

export default function Estadisticas({ vistaInicial = 'docente' }) {
  const { docentes, cursos, encuestas, grupos, toggleGrupo } = useAppData();
  const [filtroDocente, setFiltroDocente] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');

  const encuestasFiltradas = useMemo(() => encuestas.filter((e) =>
    (!filtroDocente || e.docenteId === filtroDocente)
    && (!filtroCurso || e.cursoId === filtroCurso)
    && (!filtroModalidad || e.modalidadId === filtroModalidad)
    && (!filtroGrupo || e.grupoId === filtroGrupo)
  ), [encuestas, filtroDocente, filtroCurso, filtroModalidad, filtroGrupo]);

  const datos = useMemo(() => {
    const analizadas = encuestasFiltradas
      .map((encuesta) => ({ encuesta, promedio: promedioEncuestaConInstrumento(encuesta) }))
      .filter((item) => item.promedio != null);
    const valores = encuestasFiltradas.flatMap((e) => preguntas
      .filter((p) => p.tipo !== 'texto')
      .map((p) => e.respuestas?.[p.id])
      .filter(Number.isFinite));
    const totalValores = valores.length;
    const distribucion = escalar.map((opcion, i) => ({
      valor: opcion.valor,
      etiqueta: opcion.etiqueta,
      color: COLORES_ESCALA[i % COLORES_ESCALA.length],
      cantidad: valores.filter((v) => v === opcion.valor).length,
    }));
    const porPregunta = preguntas.filter((p) => p.tipo !== 'texto').map((pregunta) => {
      const respuestas = encuestasFiltradas.map((e) => e.respuestas?.[pregunta.id]).filter(Number.isFinite);
      return { ...pregunta, promedio: promedio(respuestas), respuestas: respuestas.length };
    });
    const porSeccion = secciones.filter((s) => s.id !== 'comentario-sugerencias').map((seccion) => {
      const ids = porPregunta.filter((p) => p.seccion === seccion.id);
      const respuestas = ids.flatMap((p) => encuestasFiltradas.map((e) => e.respuestas?.[p.id]).filter(Number.isFinite));
      return { ...seccion, promedio: promedio(respuestas), respuestas: respuestas.length };
    });
    const favorables = valores.filter((v) => v >= 7).length;
    const mensual = new Map();
    analizadas.forEach(({ encuesta, promedio: score }) => {
      const fecha = new Date(encuesta.creadoEn);
      if (Number.isNaN(fecha.getTime())) return;
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const registro = mensual.get(key) || { mes: key, valores: [] };
      registro.valores.push(score);
      mensual.set(key, registro);
    });
    const tendencia = [...mensual.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-8).map((m) => {
      const [year, month] = m.mes.split('-').map(Number);
      return { ...m, promedio: promedio(m.valores), etiqueta: new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(year, month - 1)) };
    });
    const comentarios = encuestasFiltradas.flatMap((encuesta) => preguntas
      .filter((p) => p.tipo === 'texto' && String(encuesta.respuestas?.[p.id] || '').trim())
      .map((p) => ({ texto: encuesta.respuestas[p.id].trim(), pregunta: p.texto, creadoEn: encuesta.creadoEn })))
      .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
    return {
      analizadas: analizadas.length,
      promedio: promedio(analizadas.map((e) => e.promedio)),
      valores: totalValores,
      distribucion,
      porPregunta,
      porSeccion,
      favorabilidad: totalValores ? (favorables / totalValores) * 100 : null,
      tendencia,
      comentarios,
    };
  }, [encuestasFiltradas]);

  const docentesOrdenados = useMemo(() => docentes.map((d) => {
    const propias = encuestasFiltradas.filter((e) => e.docenteId === d.id);
    const valores = propias.flatMap((e) => preguntas.filter((p) => p.tipo !== 'texto').map((p) => e.respuestas?.[p.id]).filter(Number.isFinite));
    return { ...d, cantidad: propias.length, promedio: promedio(valores) };
  }).filter((d) => d.cantidad > 0).sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0)), [docentes, encuestasFiltradas]);

  const gruposFiltro = grupos.filter((g) => !filtroModalidad || g.modalidadId === filtroModalidad)
    .map((g) => ({ id: g.id, nombre: `${MODALIDADES.find((m) => m.id === g.modalidadId)?.nombre || ''} · Grupo ${g.nombre}` }));
  const seccionMasAlta = [...datos.porSeccion].filter((s) => s.promedio != null).sort((a, b) => b.promedio - a.promedio)[0];
  const filtrosResumen = [
    filtroDocente && `Docente: ${nombreDocente(docentes.find((d) => d.id === filtroDocente))}`,
    filtroCurso && `Curso: ${nombreCurso(cursos, filtroCurso)}`,
    filtroModalidad && `Modalidad: ${MODALIDADES.find((m) => m.id === filtroModalidad)?.nombre}`,
    filtroGrupo && `Grupo: ${gruposFiltro.find((g) => g.id === filtroGrupo)?.nombre}`,
  ].filter(Boolean);
  function limpiarFiltros() {
    setFiltroDocente(''); setFiltroCurso(''); setFiltroModalidad(''); setFiltroGrupo('');
  }

  if (vistaInicial === 'grupo') {
    const porModalidad = MODALIDADES.map((modalidad) => ({
      ...modalidad,
      grupos: grupos.filter((grupo) => grupo.modalidadId === modalidad.id),
    }));
    return (
      <section className="pagina">
        <div className="pagina-cabecera"><div><h2><Icon name="grupoA" size={22} /> Gestión de modalidades y grupos</h2><p className="subtitulo">Activa los grupos disponibles para nuevas respuestas.</p></div></div>
        <div className="grid-grupos-admin">
          {porModalidad.map((modalidad) => <article className="tarjeta-modalidad" key={modalidad.id}>
            <div className="tarjeta-modalidad-cabecera"><Icon name={modalidad.icono} size={23} /><h4>{modalidad.nombre}</h4><span className="insignia insignia-verde">{modalidad.grupos.filter((g) => g.activo).length} activos</span></div>
            <p className="tarjeta-curso-desc">{modalidad.descripcion}</p>
            <div className="mini-grupos">{modalidad.grupos.map((grupo) => <button key={grupo.id} className={`mini-grupo ${grupo.activo ? '' : 'mini-grupo-inactivo'}`} title={grupo.activo ? 'Clic para desactivar' : 'Clic para activar'} onClick={() => toggleGrupo(grupo.id)}><Icon name="grupoA" size={13} /> Grupo {grupo.nombre}</button>)}</div>
          </article>)}
        </div>
        <p className="ayuda-panel">Los cambios de estado se aplican a nuevas encuestas; las respuestas anteriores conservan su grupo original.</p>
      </section>
    );
  }

  return (
    <section className="pagina dashboard-encuesta">
      <div className="dash-print-head"><span>INFORME DE EVALUACIÓN DOCENTE</span><h1>Resultados del cuestionario institucional</h1><p>Generado el {new Date().toLocaleString('es')} · {datos.analizadas} encuestas analizadas</p></div>
      <div className="pagina-cabecera dash-cabecera">
        <div><span className="pagina-etiqueta"><Icon name="grafico" size={14} /> ANÁLISIS DEL INSTRUMENTO</span><h2><Icon name="grafico" size={22} /> Dashboard de evaluación</h2><p className="subtitulo">Resultados por tema, pregunta y escala del cuestionario vigente.</p></div>
        <div className="dash-cabecera-acciones"><span className="dash-corte"><Icon name="reloj" size={15} /> Actualizado con {encuestas.length} respuestas</span><button type="button" className="btn btn-primario dash-print-button" onClick={() => window.print()}><Icon name="imprimir" size={17} /> Imprimir informe</button></div>
      </div>

      <p className="dash-print-filtros"><strong>Filtros aplicados:</strong> {filtrosResumen.length ? filtrosResumen.join(' · ') : 'Todos los docentes, cursos, modalidades y grupos'}</p>

      <div className="dash-filtros">
        <SelectFiltro etiqueta="Docente" valor={filtroDocente} onChange={setFiltroDocente} opciones={docentes.map((d) => ({ id: d.id, nombre: nombreDocente(d) }))} todos="Todos los docentes" />
        <SelectFiltro etiqueta="Curso" valor={filtroCurso} onChange={setFiltroCurso} opciones={cursos} todos="Todos los cursos" />
        <SelectFiltro etiqueta="Modalidad" valor={filtroModalidad} onChange={(value) => { setFiltroModalidad(value); setFiltroGrupo(''); }} opciones={MODALIDADES} todos="Todas las modalidades" />
        <SelectFiltro etiqueta="Grupo" valor={filtroGrupo} onChange={setFiltroGrupo} opciones={gruposFiltro} todos="Todos los grupos" />
        <button className="btn btn-secundario dash-limpiar" onClick={limpiarFiltros}><Icon name="limpiar" size={15} /> Limpiar filtros</button>
      </div>

      <div className="dash-kpis">
        <Kpi icono="encuesta" titulo="Encuestas analizadas" valor={datos.analizadas} detalle="Con respuestas del instrumento vigente" />
        <Kpi icono="estrella" titulo="Promedio global" valor={datos.promedio == null ? '—' : `${datos.promedio.toFixed(2)} / 10`} detalle={`${datos.valores} valoraciones de escala`} tono="dash-kpi-azul" />
        <Kpi icono="verificado" titulo="Valoración favorable" valor={datos.favorabilidad == null ? '—' : `${Math.round(datos.favorabilidad)}%`} detalle="Respuestas 7 a 10 de la escala" tono="dash-kpi-verde" />
        <Kpi icono="grafico" titulo="Sección destacada" valor={seccionMasAlta ? seccionMasAlta.titulo : '—'} detalle={seccionMasAlta ? `Promedio ${seccionMasAlta.promedio.toFixed(2)} / 10` : 'Aún sin datos'} tono="dash-kpi-violeta" />
      </div>

      <div className="dash-graficos-grid">
        <section className="dash-panel dash-panel-secciones"><header className="dash-panel-cabecera"><div><span className="dash-panel-etiqueta">VISTA TEMÁTICA</span><h3>Promedio por sección</h3><p>Compara los seis aspectos evaluados.</p></div><span className="dash-panel-icon"><Icon name="grupoB" size={18} /></span></header><GraficoSecciones datos={datos.porSeccion} /></section>
        <section className="dash-panel dash-panel-distribucion"><header className="dash-panel-cabecera"><div><span className="dash-panel-etiqueta">VISTA DE RESPUESTAS</span><h3>Distribución de la escala</h3><p>Frecuencia de cada nivel de valoración.</p></div><span className="dash-panel-icon dash-panel-icon-oro"><Icon name="estrella" size={18} /></span></header><GraficoDistribucion datos={datos.distribucion} total={datos.valores} /><p className="dash-chart-nota">{datos.valores} respuestas de escala en el periodo filtrado.</p></section>
        <section className="dash-panel dash-panel-tendencia"><header className="dash-panel-cabecera"><div><span className="dash-panel-etiqueta">EVOLUCIÓN</span><h3>Tendencia mensual</h3><p>Promedio de las preguntas cerradas del instrumento.</p></div><span className="dash-panel-icon dash-panel-icon-verde"><Icon name="grafico" size={18} /></span></header><GraficoTendencia datos={datos.tendencia} /></section>
      </div>

      <div className="dash-contenido-grid">
        <section className="dash-panel dash-panel-preguntas"><header className="dash-panel-cabecera"><div><span className="dash-panel-etiqueta">DETALLE DEL CUESTIONARIO</span><h3>Resultado por pregunta</h3><p>Promedio y volumen de respuestas para cada ítem.</p></div></header>
          <div className="dash-tabla-scroll"><table className="dash-tabla"><thead><tr><th>Sección y pregunta</th><th>Promedio</th><th>Respuestas</th><th>Nivel</th></tr></thead><tbody>
            {datos.porPregunta.map((p) => <tr key={p.id}><td><small>{secciones.find((s) => s.id === p.seccion)?.titulo}</small><span>{p.texto}</span></td><td><strong className="dash-score">{p.promedio == null ? '—' : p.promedio.toFixed(2)}</strong></td><td>{p.respuestas}</td><td><span className="dash-mini-track"><i style={{ width: `${((p.promedio || 0) / 10) * 100}%` }} /></span></td></tr>)}
          </tbody></table></div>
        </section>
        <section className="dash-panel dash-panel-ranking"><header className="dash-panel-cabecera"><div><span className="dash-panel-etiqueta">COMPARATIVO</span><h3>Docentes evaluados</h3><p>Ordenado por promedio del instrumento actual.</p></div></header>
          {docentesOrdenados.length ? <ol className="dash-ranking">{docentesOrdenados.slice(0, 8).map((d, i) => <li key={d.id}><span className="dash-ranking-pos">{String(i + 1).padStart(2, '0')}</span><div><strong>{nombreDocente(d)}</strong><small>{nombreCurso(cursos, d.cursoId)} · {d.cantidad} encuesta(s)</small><span className="dash-ranking-track"><i style={{ width: `${((d.promedio || 0) / 10) * 100}%` }} /></span></div><b>{d.promedio == null ? '—' : d.promedio.toFixed(2)}</b></li>)}</ol> : <div className="dash-vacio">No hay docentes con respuestas del instrumento actual.</div>}
        </section>
      </div>

      <section className="dash-panel dash-comentarios"><header className="dash-panel-cabecera"><div><span className="dash-panel-etiqueta">APORTE CUALITATIVO</span><h3>Comentarios y sugerencias</h3><p>Respuestas abiertas opcionales, sin datos del estudiante.</p></div><span className="dash-comentarios-total">{datos.comentarios.length} comentario(s)</span></header>
        {datos.analizadas < RESPUESTAS_MINIMAS_COMENTARIOS ? <div className="dash-vacio">Los comentarios se muestran cuando el grupo reúne al menos {RESPUESTAS_MINIMAS_COMENTARIOS} encuestas para cuidar el anonimato.</div>
          : datos.comentarios.length ? <div className="dash-comentarios-lista">{datos.comentarios.map((c, i) => <article key={`${c.creadoEn}-${i}`}><span><Icon name="libro" size={16} /></span><div><strong>{c.pregunta}</strong><p>“{c.texto}”</p><small>Respuesta anónima · {new Date(c.creadoEn).toLocaleDateString('es')}</small></div></article>)}</div>
            : <div className="dash-vacio">Todavía no hay comentarios para los filtros seleccionados.</div>}
      </section>

      <p className="ayuda-panel dash-privacidad"><Icon name="refuerzo" size={15} /> Los promedios solo consideran las 24 preguntas de escala. Las respuestas abiertas quedan fuera de los gráficos y promedios.</p>
    </section>
  );
}
