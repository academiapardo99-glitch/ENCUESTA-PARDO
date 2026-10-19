import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';
import { nombreDocente, preguntas, secciones, escalar } from '../services/dataService.js';
import Icon from '../components/comunes/Icon.jsx';

// ===== Utilidades de análisis =====
const media = (xs) => {
  const vals = xs.filter(Number.isFinite);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};
const pct = (v) => (v == null ? 0 : Math.max(0, Math.min(100, (v / 10) * 100)));
const fmt = (v) => (v == null ? '—' : v.toFixed(2));
const nf = new Intl.NumberFormat('es');

function cuantil(xs, q) {
  if (!xs.length) return null;
  const orden = [...xs].sort((a, b) => a - b);
  const pos = (orden.length - 1) * q;
  const bajo = Math.floor(pos);
  const alto = Math.ceil(pos);
  return orden[bajo] + (orden[alto] - orden[bajo]) * (pos - bajo);
}

// Etiqueta cualitativa del promedio: el color nunca es la única señal.
function nivel(score) {
  if (score == null) return { texto: 'Sin datos', clase: 'neutro' };
  if (score >= 7) return { texto: 'Favorable', clase: 'alto' };
  if (score >= 5) return { texto: 'Intermedio', clase: 'medio' };
  return { texto: 'Por mejorar', clase: 'bajo' };
}

function Dato({ etiqueta, valor, unidad, detalle, acento }) {
  return (
    <div className={`pres-dato ${acento ? `pres-dato-${acento}` : ''}`}>
      <span className="pres-dato-etiqueta">{etiqueta}</span>
      <strong className="pres-dato-valor">
        {valor}
        {unidad && <small>{unidad}</small>}
      </strong>
      {detalle && <span className="pres-dato-detalle">{detalle}</span>}
    </div>
  );
}

function GraficoBloque({ bloque }) {
  const items = bloque.items;
  const mejor = [...items].filter((q) => q.score != null).sort((a, b) => b.score - a.score)[0];
  const foco = [...items].filter((q) => q.score != null).sort((a, b) => a.score - b.score)[0];
  const codigo = (item) => `P${String(items.findIndex((q) => q.id === item.id) + 1).padStart(2, '0')}`;
  return (
    <div className="pres-bloque-analisis">
      <div className="pres-barras-verticales" role="img" aria-label={`Promedio por pregunta en ${bloque.titulo}, escala de uno a diez`}>
        <div className="pres-eje-y">{[10, 8, 6, 4, 2, 0].map((v) => <span key={v}>{v}</span>)}</div>
        <div className="pres-columnas">
          {[10, 8, 6, 4, 2, 0].map((v) => <i className="pres-linea-eje" key={v} style={{ top: `${100 - v * 10}%` }}><span>{v === 0 ? ' ' : ''}</span></i>)}
          {items.map((q, i) => <div className="pres-columna-pregunta" key={q.id}>
            <strong className="pres-valor-columna">{fmt(q.score)}</strong>
            <div className="pres-area-columna"><i className={`pres-barra-vertical pres-barra-${nivel(q.score).clase}`} style={{ height: `${pct(q.score)}%` }} /></div>
            <span className="pres-codigo-pregunta">P{String(i + 1).padStart(2, '0')}</span>
          </div>)}
        </div>
      </div>
      <div className="pres-detalle-preguntas">{items.map((q, i) => <article key={q.id}><span>P{String(i + 1).padStart(2, '0')}</span><p>{q.texto}</p><small>{q.score == null ? 'Sin datos' : `${q.favorable}% favorable`} · {q.count} respuestas</small></article>)}</div>
      <p className="pres-bloque-hallazgo">{mejor && foco ? <>Mejor resultado: <b>{codigo(mejor)}</b> ({fmt(mejor.score)}/10). Prioridad de seguimiento: <b>{codigo(foco)}</b> ({fmt(foco.score)}/10).</> : 'Aún no hay respuestas suficientes para interpretar este bloque.'}</p>
    </div>
  );
}

export default function PresentacionPage() {
  const { docentes, cursos, modalidades, encuestas } = useAppData();

  const [docenteId, setDocenteId] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [modalidadId, setModalidadId] = useState('');
  const [slide, setSlide] = useState(0);
  const [pantalla, setPantalla] = useState(false);
  const slideRef = useRef(null);

  const docente = docentes.find((d) => d.id === docenteId);
  const curso = cursos.find((c) => c.id === cursoId);
  const modalidad = modalidades.find((m) => m.id === modalidadId);
  // ===== Cálculo de métricas =====
  const data = useMemo(() => {
    const lista = encuestas.filter(
      (e) =>
        (!docenteId || e.docenteId === docenteId) &&
        (!cursoId || e.cursoId === cursoId) &&
        (!modalidadId || e.modalidadId === modalidadId)
    );

    const deEscala = preguntas.filter((p) => p.tipo !== 'texto');
    const deTexto = preguntas.filter((p) => p.tipo === 'texto');

    // Promedio individual de cada encuesta (solo preguntas de escala).
    const validas = lista
      .map((encuesta) => ({
        encuesta,
        score: media(deEscala.map((p) => encuesta.respuestas?.[p.id])),
      }))
      .filter((e) => e.score != null);

    const valoraciones = lista.flatMap((e) =>
      deEscala.map((p) => e.respuestas?.[p.id]).filter((v) => Number.isFinite(v) && v >= 1 && v <= 10)
    );

    const dimensiones = secciones
      .filter((s) => s.id !== 'comentario-sugerencias')
      .map((seccion) => {
        const propias = deEscala.filter((q) => q.seccion === seccion.id);
        const porEncuesta = validas
          .map(({ encuesta }) => media(propias.map((p) => encuesta.respuestas?.[p.id])))
          .filter(Number.isFinite);
        const items = propias.map((q) => {
          const valores = lista.map((e) => e.respuestas?.[q.id]).filter(Number.isFinite);
          const favorable = valores.length ? Math.round(valores.filter((v) => v >= 7).length / valores.length * 100) : null;
          return { ...q, score: media(valores), count: valores.length, favorable };
        });
        return {
          ...seccion,
          score: media(porEncuesta),
          distribucion: porEncuesta,
          count: porEncuesta.length,
          items,
        };
      })
      .filter((d) => d.items.length > 0 && d.count > 0);

    // Tendencia mensual.
    const meses = new Map();
    validas.forEach(({ encuesta, score }) => {
      const fecha = new Date(encuesta.creadoEn);
      if (Number.isNaN(fecha.getTime())) return;
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const fila = meses.get(key) || { key, scores: [] };
      fila.scores.push(score);
      meses.set(key, fila);
    });
    const tendencia = [...meses.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8)
      .map((m) => {
        const [anio, mes] = m.key.split('-').map(Number);
        return {
          ...m,
          score: media(m.scores),
          label: new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' }).format(new Date(anio, mes - 1)),
        };
      });

    const preguntasPlanas = dimensiones
      .flatMap((d) => d.items.map((q) => ({ ...q, dimension: d.titulo })))
      .filter((q) => q.score != null);

    const comentarios = validas.length >= 5
      ? lista.flatMap((entrada) =>
          deTexto
            .filter((q) => String(entrada.respuestas?.[q.id] || '').trim())
            .map((q) => ({
              tipo: /mejorar/i.test(q.texto) ? 'mejora' : 'valora',
              pregunta: q.texto,
              texto: String(entrada.respuestas[q.id]).trim(),
            }))
        )
      : [];

    const distribucion = escalar.map((o) => ({
      ...o,
      count: valoraciones.filter((v) => v === o.valor).length,
    }));

    return {
      lista,
      validas,
      valoraciones,
      totalValoraciones: valoraciones.length,
      dimensiones,
      tendencia,
      preguntas: preguntasPlanas,
      comentarios,
      comentariosOcultos: validas.length < 5,
      promedio: media(validas.map((v) => v.score)),
      favorabilidad: valoraciones.length
        ? (valoraciones.filter((v) => v >= 7).length / valoraciones.length) * 100
        : null,
      distribucion,
    };
  }, [encuestas, docenteId, cursoId, modalidadId]);

  const diapositivas = useMemo(() => [
    { tipo: 'resumen', titulo: 'Resumen' },
    ...data.dimensiones.map((bloque) => ({ tipo: 'bloque', titulo: bloque.titulo, id: bloque.id })),
    ...(data.totalValoraciones ? [{ tipo: 'distribucion', titulo: 'Distribución' }] : []),
    ...(data.tendencia.length ? [{ tipo: 'tendencia', titulo: 'Tendencia' }] : []),
    ...(data.validas.length > 1 && data.dimensiones.length ? [{ tipo: 'dispersion', titulo: 'Dispersión' }] : []),
    { tipo: 'comentarios', titulo: 'Comentarios' },
  ], [data]);
  const totalDiapositivas = diapositivas.length;
  const diapositivaActual = diapositivas[slide] || diapositivas[0];

  useEffect(() => { setSlide(0); }, [docenteId, cursoId, modalidadId]);

  // Navegación con teclado.
  useEffect(() => {
    const onKey = (event) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        setSlide((v) => Math.min(totalDiapositivas - 1, v + 1));
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        setSlide((v) => Math.max(0, v - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalDiapositivas]);

  useEffect(() => {
    const onChange = () => setPantalla(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function alternarPantalla() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else slideRef.current?.requestFullscreen?.();
  }

  const ordenadas = [...data.dimensiones].filter((d) => d.score != null).sort((a, b) => b.score - a.score);
  const mejor = ordenadas[0];
  const peor = ordenadas[ordenadas.length - 1];
  const alcance = [
    docente && nombreDocente(docente),
    curso && curso.nombre,
    modalidad && modalidad.nombre,
  ].filter(Boolean);

  const totalDist = data.totalValoraciones;
  const donut = (() => {
    let offset = 0;
    return data.distribucion
      .map((d, i) => {
        const parte = totalDist ? (d.count / totalDist) * 100 : 0;
        const seg = `var(--pres-serie-${i + 1}) ${offset}% ${offset + parte}%`;
        offset += parte;
        return seg;
      })
      .join(', ');
  })();

  const puntos = data.tendencia.map((d, i) => ({
    x: data.tendencia.length === 1 ? 50 : (i / (data.tendencia.length - 1)) * 100,
    y: 100 - pct(d.score),
    ...d,
  }));
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');

  // ===== Diapositivas =====
  function contenido() {
    if (diapositivaActual.tipo === 'resumen') return <>
      <div className="pres-cover"><span className="pres-eyebrow">INFORME EJECUTIVO · {new Date().toLocaleDateString('es')}</span><h1>{docente ? nombreDocente(docente) : 'Desempeño docente'}</h1><p>{alcance.length ? alcance.join(' · ') : 'Panorama general de evaluación docente'}</p></div>
      <div className="pres-kpis"><Dato etiqueta="Encuestas" valor={nf.format(data.validas.length)} detalle="con respuestas válidas" /><Dato etiqueta="Promedio general" valor={fmt(data.promedio)} unidad="/ 10" acento="azul" /><Dato etiqueta="Valoración favorable" valor={data.favorabilidad == null ? '—' : `${Math.round(data.favorabilidad)}%`} detalle="respuestas 7 a 10" acento="verde" /><Dato etiqueta="Valoraciones" valor={nf.format(data.totalValoraciones)} detalle="respuestas de escala" /></div>
      <div className="pres-insight-strip"><span><b>Fortaleza relativa</b>{mejor ? `${mejor.titulo} · ${fmt(mejor.score)} / 10` : 'Sin datos suficientes'}</span><span><b>Mayor oportunidad</b>{peor ? `${peor.titulo} · ${fmt(peor.score)} / 10` : 'Sin datos suficientes'}</span></div>
      <p className="pres-footnote">El promedio resume las preguntas de escala del instrumento vigente. La favorabilidad corresponde a las respuestas 7 a 10.</p>
    </>;
    if (diapositivaActual.tipo === 'bloque') {
      const indiceBloque = data.dimensiones.findIndex((d) => d.id === diapositivaActual.id);
      const bloque = data.dimensiones[indiceBloque];
      const mejores = [...bloque.items].filter((q) => q.score != null).sort((a, b) => b.score - a.score);
      const brechaBloque = mejores.length > 1 ? mejores[0].score - mejores[mejores.length - 1].score : null;
      return <>
        <div className="pres-section-intro"><span className="pres-eyebrow">BLOQUE {String(indiceBloque + 1).padStart(2, '0')} · {bloque.items.length} PREGUNTAS</span><h2>{bloque.titulo}</h2><p>{bloque.descripcion || 'Comparación del promedio por pregunta en la escala de 1 a 10.'}</p></div>
        <GraficoBloque bloque={bloque} />
        {brechaBloque != null && <p className="pres-chart-note">Diferencia entre la pregunta mejor y peor valorada del bloque: {brechaBloque.toFixed(2)} puntos.</p>}
      </>;
    }
    if (diapositivaActual.tipo === 'distribucion') return <>
      <div className="pres-section-intro"><span className="pres-eyebrow">EXPERIENCIA DEL ESTUDIANTE</span><h2>Distribución de valoraciones</h2><p>Frecuencia de cada nivel en las respuestas del cuestionario.</p></div>
      <div className="pres-distribution"><div className="pres-donut" style={{ background: totalDist ? `conic-gradient(${donut})` : '#e8edf3' }}><div><strong>{nf.format(totalDist)}</strong><small>respuestas</small></div></div><div className="pres-legend">{data.distribucion.map((d, i) => <div key={d.valor}><i style={{ background: `var(--pres-serie-${i + 1})` }} /><span><b>{d.valor} · {d.etiqueta}</b><small>{nf.format(d.count)} respuestas · {totalDist ? Math.round(d.count / totalDist * 100) : 0}%</small></span></div>)}</div></div>
    </>;
    if (diapositivaActual.tipo === 'tendencia') return <>
      <div className="pres-section-intro"><span className="pres-eyebrow">EVOLUCIÓN</span><h2>Desempeño en el tiempo</h2><p>Promedio mensual de las encuestas, normalizado al 100%.</p></div>
      {puntos.length ? <div className="pres-trend-wrap"><div className="pres-trend-y">{[100, 75, 50, 25, 0].map((v) => <span key={v}>{v}%</span>)}</div><svg className="pres-trend" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Evolución mensual del promedio">{[0, 25, 50, 75, 100].map((v) => <line key={v} x1="0" x2="100" y1={v} y2={v} className="pres-gridline" />)}<path d={linea} className="pres-line" />{puntos.map((p) => <circle key={p.key} cx={p.x} cy={p.y} r="1.6" className="pres-point"><title>{p.label}: {fmt(p.score)} de 10 · {p.scores.length} encuestas</title></circle>)}</svg><div className="pres-trend-x">{puntos.map((p) => <span key={p.key}>{p.label}</span>)}</div><div className="pres-trend-counts">{puntos.map((p) => <span key={p.key}>{p.scores.length} enc.</span>)}</div></div> : <p className="pres-empty">Aún no hay suficientes respuestas fechadas para mostrar la evolución.</p>}
      <p className="pres-chart-note">Se muestran los últimos {data.tendencia.length} meses con respuestas. El valor mensual es el promedio de cada encuesta individual.</p>
    </>;
    if (diapositivaActual.tipo === 'dispersion') return <>
      <div className="pres-section-intro"><span className="pres-eyebrow">DISPERSIÓN · ESCALA 0–100%</span><h2>Consistencia por dimensión</h2><p>Rango, cuartiles y mediana de los promedios individuales.</p></div>
      <div className="pres-boxplot">{data.dimensiones.map((d) => { const vals = d.distribucion.map(pct); const min = vals.length ? Math.min(...vals) : 0; const max = vals.length ? Math.max(...vals) : 0; const q1 = cuantil(vals, .25) ?? 0; const med = cuantil(vals, .5) ?? 0; const q3 = cuantil(vals, .75) ?? 0; return <div className="pres-box-row" key={d.id}><span className="pres-box-name">{d.titulo}</span><div className="pres-box-track"><i className="pres-whisker" style={{ left: `${min}%`, width: `${max - min}%` }} /><i className="pres-cap" style={{ left: `${min}%` }} /><i className="pres-cap" style={{ left: `${max}%` }} /><i className="pres-box" style={{ left: `${q1}%`, width: `${Math.max(q3 - q1, .5)}%` }} /><i className="pres-median" style={{ left: `${med}%` }} /></div><b className="pres-box-median">{vals.length ? `${Math.round(med)}%` : '—'}</b></div>; })}<div className="pres-axis"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div></div>
      <div className="pres-box-legend"><span><i className="pres-legend-whisker" />Mínimo–máximo</span><span><i className="pres-legend-box" />Rango intercuartílico</span><span><i className="pres-legend-median" />Mediana</span></div>
    </>;
    const elogios = data.comentarios.filter((c) => c.tipo === 'valora');
    const sugerencias = data.comentarios.filter((c) => c.tipo === 'mejora');
    return <>
      <div className="pres-section-intro"><span className="pres-eyebrow">CIERRE · COMENTARIOS ANÓNIMOS</span><h2>La voz de los estudiantes</h2><p>{data.comentariosOcultos ? `Los comentarios se mostrarán al reunir cinco encuestas. En este filtro hay ${data.validas.length}.` : `${data.comentarios.length} comentarios de ${data.validas.length} encuestas.`}</p></div>
      {!data.comentariosOcultos ? <div className="pres-comments-grid">{[["Lo que más valoran", elogios], ["Sugerencias de mejora", sugerencias]].map(([titulo, comentarios], i) => <section key={titulo}><header><span className={`pres-comment-mark ${i ? 'pres-comment-improve' : ''}`}>{i ? '↗' : '✓'}</span><div><h3>{titulo}</h3><small>{comentarios.length} comentarios</small></div></header>{comentarios.length ? <ul>{comentarios.map((c, j) => <li key={`${c.tipo}-${j}`}>{c.texto}</li>)}</ul> : <p className="pres-empty">No hay comentarios en este grupo.</p>}</section>)}</div> : <div className="pres-comments-private"><Icon name="refuerzo" size={22} /> Se mantiene la privacidad de las respuestas abiertas.</div>}
    </>;
  }

  return <section className={`pagina presentacion-page pres-responsive ${pantalla ? 'pres-en-pantalla' : ''}`}>
    {!pantalla && <header className="pres-toolbar"><div><span className="pagina-etiqueta"><Icon name="grafico" size={14} /> PRESENTACIÓN EJECUTIVA</span><h2>Desempeño docente</h2><p>Presentación visual lista para exponer.</p></div><div className="pres-controls-top"><label><span>Docente</span><select className="input" value={docenteId} onChange={(e) => setDocenteId(e.target.value)}><option value="">Todos los docentes</option>{docentes.map((d) => <option key={d.id} value={d.id}>{nombreDocente(d)}</option>)}</select></label><label><span>Curso</span><select className="input" value={cursoId} onChange={(e) => setCursoId(e.target.value)}><option value="">Todos los cursos</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label><span>Modalidad</span><select className="input" value={modalidadId} onChange={(e) => setModalidadId(e.target.value)}><option value="">Todas las modalidades</option>{modalidades.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label><button className="btn btn-secundario" onClick={alternarPantalla}><Icon name={pantalla ? 'cerrar' : 'ver'} size={16} /> {pantalla ? 'Salir' : 'Pantalla completa'}</button></div></header>}
    <div className="pres-stage pres-responsive-stage"><div ref={slideRef} className="pres-slide pres-responsive-slide" aria-live="polite"><div className="pres-content pres-responsive-content">{contenido()}</div></div></div>
    <footer className="pres-navigation pres-responsive-nav"><button type="button" className="btn btn-secundario" onClick={() => setSlide((v) => Math.max(0, v - 1))} disabled={slide === 0}><Icon name="flechaIzquierda" size={16} /> Anterior</button><div className="pres-dots" aria-label="Seleccionar diapositiva">{diapositivas.map((item, i) => <button type="button" key={`${item.tipo}-${item.id || item.titulo}`} className={slide === i ? 'active' : ''} onClick={() => setSlide(i)} aria-label={`Diapositiva ${i + 1}: ${item.titulo}`} />)}</div><span className="pres-key-hint">Usa ← → para avanzar</span><button type="button" className="btn btn-primario" onClick={() => setSlide((v) => Math.min(totalDiapositivas - 1, v + 1))} disabled={slide === totalDiapositivas - 1}>Siguiente <Icon name="flechaDerecha" size={16} /></button></footer>
  </section>;
}

