import { useState, useMemo } from 'react';
import {
  useAppData, nombreCurso, promedioDeEncuestas,
} from '../context/AppDataContext.jsx';
import {
  preguntas, secciones, tituloEncuesta, subtituloEncuesta, congelarDocente, nombreModalidad, nombreDocente,
  modalidadesDe, docentesDelGrupo, gruposDeCurso,
} from '../services/dataService.js';
import ConfirmDialog from '../components/comunes/ConfirmDialog.jsx';
import Icon from '../components/comunes/Icon.jsx';
import SelectorModalidadGrupo from '../components/encuestas/SelectorModalidadGrupo.jsx';
import EscalaOpciones from '../components/encuestas/EscalaOpciones.jsx';

const ESTADO_INICIAL = { modalidadId: '', grupoId: '', docenteId: '', respuestas: {} };

export default function EncuestasPage() {
  const { docentes, cursos, encuestas, grupos, modalidades, enviarEncuesta } = useAppData();

  const [paso, setPaso] = useState(1);
  const [seleccion, setSeleccion] = useState(ESTADO_INICIAL);
  const [filtroCurso, setFiltroCurso] = useState('');
  const [error, setError] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [enviado, setEnviado] = useState(null);

  const docente = docentes.find((d) => d.id === seleccion.docenteId);
  const grupo = grupos.find((g) => g.id === seleccion.grupoId);
  const modalidad = modalidades.find((m) => m.id === seleccion.modalidadId);

  const preguntasObligatorias = preguntas.filter((p) => p.obligatoria !== false);
  const respuestasDadas = preguntasObligatorias.filter((p) => seleccion.respuestas[p.id] !== undefined && seleccion.respuestas[p.id] !== '').length;
  const progreso = Math.round((respuestasDadas / preguntasObligatorias.length) * 100);
  const preguntasPorSeccion = secciones.map((seccion) => ({
    ...seccion,
    preguntas: preguntas.filter((p) => p.seccion === seccion.id),
  })).filter((seccion) => seccion.preguntas.length);

  // Solo docentes de la modalidad y grupo elegidos.
  const docentesDelGrupoActual = useMemo(
    () => docentesDelGrupo(docentes, cursos, seleccion),
    [docentes, cursos, seleccion.modalidadId, seleccion.grupoId]
  );

  // Cursos que se dictan en el grupo elegido.
  const cursosDelGrupo = useMemo(() => {
    if (!seleccion.grupoId) return [];
    return cursos
      .filter((c) => gruposDeCurso(c).includes(seleccion.grupoId))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [cursos, seleccion.grupoId]);

  const docentesLista = useMemo(() => {
    const base = filtroCurso
      ? docentesDelGrupoActual.filter((d) => d.cursoId === filtroCurso)
      : docentesDelGrupoActual;
    return base
      .map((d) => {
        const propias = encuestas.filter((e) => e.docenteId === d.id);
        return { ...d, nEncuestas: propias.length, promedio: promedioDeEncuestas(propias) };
      })
      .sort((a, b) =>
        nombreDocente(a).localeCompare(nombreDocente(b), 'es')
      );
  }, [docentesDelGrupoActual, filtroCurso, encuestas]);

  function cambiarSeleccion(cambios) {
    setSeleccion((s) => {
      const nuevo = { ...s, ...cambios };
      // Al cambiar modalidad o grupo, el docente elegido deja de ser válido.
      if (
        (cambios.modalidadId !== undefined && cambios.modalidadId !== s.modalidadId)
        || (cambios.grupoId !== undefined && cambios.grupoId !== s.grupoId)
      ) {
        nuevo.docenteId = '';
        nuevo.respuestas = {};
        setFiltroCurso('');
      }
      return nuevo;
    });
    if (error) setError('');
  }

  function responder(preguntaId, valor) {
    setSeleccion((s) => ({ ...s, respuestas: { ...s.respuestas, [preguntaId]: valor } }));
    if (error) setError('');
  }

  function irAPreguntas(e) {
    e.preventDefault();
    if (!seleccion.docenteId) {
      setError('Selecciona el docente a evaluar.');
      return;
    }
    if (!docentesDelGrupoActual.some((d) => d.id === seleccion.docenteId)) {
      setError('El docente seleccionado no dicta clases en este grupo. Elige otro.');
      return;
    }
    setPaso(4);
  }

  function enviar(e) {
    e.preventDefault();
    const faltantes = preguntasObligatorias.filter((p) => seleccion.respuestas[p.id] === undefined || seleccion.respuestas[p.id] === '');
    if (faltantes.length) {
      setError(`Faltan por responder ${faltantes.length} pregunta(s) de escala. Los comentarios son opcionales.`);
      return;
    }
    setConfirmar(true);
  }

  function confirmarEnvio() {
    const cursoId = docente.cursoId;
    const congelado = congelarDocente(docente, cursos.find((c) => c.id === cursoId));
    enviarEncuesta({
      docenteId: congelado.docenteId,
      cursoId,
      modalidadId: seleccion.modalidadId,
      grupoId: grupo.id,
      grupoNombre: grupo.nombre,
      respuestas: seleccion.respuestas,
    }).then(() => {
      setEnviado({ docente: congelado, modalidad, grupo, respuestas: seleccion.respuestas });
      setSeleccion(ESTADO_INICIAL);
      setPaso(1);
      setConfirmar(false);
    });
  }

  if (enviado) {
    const valoresNumericos = Object.values(enviado.respuestas).filter(Number.isFinite);
    const promedio = valoresNumericos.reduce((a, b) => a + b, 0) / valoresNumericos.length;
    return (
      <section className="pagina">
        <div className="exito-encuesta">
          <span className="exito-icono"><Icon name="verificado" size={56} color="#2e7d32" /></span>
          <h2>¡Encuesta registrada!</h2>
          <p>Gracias por evaluar a <strong>{enviado.docente.nombreCompleto}</strong>.</p>
          <div className="chips">
            <span className="chip"><Icon name="universidad" size={16} /> {enviado.modalidad.nombre}</span>
            <span className="chip"><Icon name="grupoA" size={16} /> Grupo {enviado.grupo.nombre}</span>
            <span className="chip"><Icon name="estrella" size={16} /> Promedio {promedio.toFixed(2)} / 10</span>
          </div>
          <p className="subtitulo">Tu encuesta es anónima y no permite identificarte.</p>
          <button className="btn btn-primario" onClick={() => setEnviado(null)}>
            <Icon name="encuesta" size={17} /> Responder otra encuesta
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina">
      <div className="pagina-cabecera">
        <div>
          <h2><Icon name="encuesta" size={22} /> {tituloEncuesta()}</h2>
          <p className="subtitulo">{subtituloEncuesta()}</p>
        </div>
        <div className="chips">
          {modalidad && <span className="chip chip-azul"><Icon name="universidad" size={15} /> {modalidad.nombre}</span>}
          {grupo && <span className="chip chip-azul"><Icon name="grupoA" size={15} /> Grupo {grupo.nombre}</span>}
        </div>
      </div>

      <ol className="barra-pasos">
        {['Modalidad', 'Grupo', 'Docente', 'Preguntas'].map((t, i) => {
          const n = i + 1;
          const completo = n < paso;
          return (
            <li key={t} className={`paso ${n === paso ? 'paso-activo' : ''} ${completo ? 'paso-completo' : ''}`}>
              <span className="paso-circulo">{completo ? <Icon name="check" size={14} /> : n}</span>
              {t}
            </li>
          );
        })}
      </ol>

      {paso === 1 && (
        <div className="tarjeta-form tarjeta-pasos">
          <SelectorModalidadGrupo
            modalidades={modalidades}
            grupos={grupos}
            encuestas={encuestas}
            seleccion={seleccion}
            onCambiar={cambiarSeleccion}
          />
          {seleccion.modalidadId && (
            <div className="modal-acciones">
              <button className="btn btn-primario" disabled={!seleccion.grupoId} onClick={() => setPaso(3)}>
                Continuar <Icon name="check" size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {paso === 3 && (
        <div className="tarjeta-form tarjeta-pasos">
          <div className="paso-titulo">
            <span className="paso-num">3</span>
            <div>
              <h3>¿Qué docente vas a evaluar?</h3>
              <div className="chips">
                <span className="chip"><Icon name="universidad" size={15} /> {modalidad?.nombre}</span>
                <span className="chip"><Icon name="grupoA" size={15} /> Grupo {grupo?.nombre}</span>
              </div>
            </div>
          </div>

          <form onSubmit={irAPreguntas} className="form" noValidate>
            {cursosDelGrupo.length > 1 && (
              <label className="campo">
                <span>Filtrar por curso (opcional)</span>
                <select className="input" value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}>
                  <option value="">Todos los cursos del grupo</option>
                  {cursosDelGrupo.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
            )}

            {docentesDelGrupoActual.length === 0 ? (
              <p className="alerta alerta-error">
                No hay docentes activos para <strong>{modalidad?.nombre}</strong> · Grupo <strong>{grupo?.nombre}</strong>.
                Revisa que el curso esté asignado a este grupo y que el docente tenga esa modalidad.
              </p>
            ) : docentesLista.length === 0 ? (
              <p className="mensaje-vacio">No hay docentes de ese curso en este grupo.</p>
            ) : (
              <div className="grid-docentes" role="radiogroup" aria-label="Docente">
                {docentesLista.map((d) => {
                  const elegido = seleccion.docenteId === d.id;
                  const iniciales = nombreDocente(d).split(' ').map((p) => p[0] || '').slice(0, 2).join('').toUpperCase();
                  return (
                    <button
                      type="button"
                      key={d.id}
                      role="radio"
                      aria-checked={elegido}
                      className={`docente-card ${elegido ? 'docente-card-activa' : ''}`}
                      onClick={() => cambiarSeleccion({ docenteId: d.id })}
                    >
                      <span className="avatar">{iniciales}</span>
                      <span className="docente-info">
                        <strong>{nombreDocente(d)}</strong>
                        <small>{nombreCurso(cursos, d.cursoId)}</small>
                        <small className="docente-mods">{modalidadesDe(d).length ? `Modalidades: ${modalidadesDe(d).map((m) => nombreModalidad(m)).join(', ')}` : ''}</small>
                        <small className="docente-meta">
                          <Icon name="reloj" size={13} /> {d.nEncuestas} encuesta(s)
                          {d.promedio != null && ` · ${d.promedio.toFixed(1)}/10`}
                        </small>
                      </span>
                      {elegido && <Icon name="check" size={20} color="#1e4e8c" />}
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p className="alerta alerta-error">{error}</p>}

            <div className="modal-acciones">
              <button type="button" className="btn btn-secundario" onClick={() => setPaso(1)}>Volver</button>
              <button type="submit" className="btn btn-primario" disabled={!seleccion.docenteId}>
                Continuar <Icon name="check" size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {paso === 4 && docente && (
        <form onSubmit={enviar} className="form tarjeta-form tarjeta-pasos" noValidate>
          <div className="paso-titulo">
            <span className="paso-num">4</span>
            <div>
              <h3>Evalúa a {nombreDocente(docente)}</h3>
              <p>
                {modalidad?.nombre} · Grupo {grupo?.nombre} · <strong>{nombreCurso(cursos, docente.cursoId)}</strong>
              </p>
            </div>
          </div>

          <div className="progreso">
            <div className="progreso-fondo" role="progressbar" aria-label="Progreso de la encuesta" aria-valuemin={0} aria-valuemax={preguntasObligatorias.length} aria-valuenow={respuestasDadas}>
              <div className="progreso-barra" style={{ width: `${progreso}%` }} />
            </div>
            <span aria-live="polite"><strong>{respuestasDadas} de {preguntasObligatorias.length}</strong> preguntas de escala respondidas</span>
          </div>

          <div className="encuesta-bloques">
            {preguntasPorSeccion.map((seccion) => (
              <section className="encuesta-seccion" key={seccion.id}>
                <header className="encuesta-seccion-cabecera">
                  <span className="encuesta-seccion-marca"><Icon name={seccion.id === 'comentario-sugerencias' ? 'libro' : 'encuesta'} size={17} /></span>
                  <div><h4>{seccion.titulo}</h4><p>{seccion.descripcion}</p></div>
                  {seccion.id !== 'comentario-sugerencias' && <span className="encuesta-seccion-total">{seccion.preguntas.length} ítems</span>}
                </header>
                <ol className="lista-preguntas">
                  {seccion.preguntas.map((p, i) => {
                    const contestada = p.tipo === 'texto' ? Boolean(seleccion.respuestas[p.id]?.trim()) : seleccion.respuestas[p.id] !== undefined;
                    return (
                      <li key={p.id} className={`pregunta ${contestada ? 'pregunta-respondida' : ''} ${p.tipo === 'texto' ? 'pregunta-abierta' : ''}`}>
                        <span className="pregunta-texto">
                          <span className="pregunta-numero">{String(i + 1).padStart(2, '0')}</span>
                          <span className="pregunta-enunciado">{p.texto}{p.obligatoria === false && <small className="pregunta-opcional">Opcional</small>}</span>
                          {contestada && <span className="pregunta-lista" aria-label="Respondida"><Icon name="check" size={15} /></span>}
                        </span>
                        {p.tipo === 'texto' ? (
                          <div className="respuesta-abierta-wrap">
                            <textarea className="input respuesta-abierta" rows={4} maxLength={p.maxLength || 500}
                              value={seleccion.respuestas[p.id] || ''}
                              onChange={(e) => responder(p.id, e.target.value)}
                              placeholder="Escribe tu respuesta con respeto y de forma concreta…"
                              aria-label={p.texto} />
                            <span className="respuesta-abierta-meta">{(seleccion.respuestas[p.id] || '').length}/{p.maxLength || 500} caracteres · No incluyas datos personales</span>
                          </div>
                        ) : <EscalaOpciones preguntaId={p.id} preguntaTexto={p.texto} valor={seleccion.respuestas[p.id]} onChange={responder} />}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>

          {error && <p className="alerta alerta-error">{error}</p>}

          <div className="modal-acciones">
            <button type="button" className="btn btn-secundario" onClick={() => setPaso(3)}>Volver</button>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => cambiarSeleccion({ respuestas: {} })}
            >
              <Icon name="limpiar" size={16} /> Limpiar
            </button>
            <button type="submit" className="btn btn-primario">
              <Icon name="enviar" size={16} /> Enviar encuesta
            </button>
          </div>
        </form>
      )}

      {confirmar && (
        <ConfirmDialog
          titulo="Enviar encuesta"
          mensaje={`Vas a evaluar a ${nombreDocente(docente)} desde ${nombreModalidad(seleccion.modalidadId)} · Grupo ${grupo?.nombre}. Las respuestas no se pueden modificar después.`}
          onCancelar={() => setConfirmar(false)}
          onConfirmar={confirmarEnvio}
        />
      )}
    </section>
  );
}
