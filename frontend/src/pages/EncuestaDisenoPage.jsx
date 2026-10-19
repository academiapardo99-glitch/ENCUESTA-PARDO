import { useAppData } from '../context/AppDataContext.jsx';
import Icon from '../components/comunes/Icon.jsx';
import { ESCALA_POR_DEFECTO, PREGUNTAS_POR_DEFECTO, SECCIONES_POR_DEFECTO } from '../utils/instrumento.js';

export default function EncuestaDisenoPage() {
  const { instrumento, encuestas } = useAppData();
  const preguntas = instrumento?.preguntas || PREGUNTAS_POR_DEFECTO;
  const escala = instrumento?.escala || ESCALA_POR_DEFECTO;
  const secciones = instrumento?.secciones || SECCIONES_POR_DEFECTO;
  const agrupadas = secciones.map((seccion) => ({
    ...seccion,
    preguntas: preguntas.filter((pregunta) => pregunta.seccion === seccion.id),
  })).filter((seccion) => seccion.preguntas.length);
  const cuantitativas = preguntas.filter((p) => p.tipo !== 'texto').length;
  const abiertas = preguntas.filter((p) => p.tipo === 'texto').length;

  return (
    <section className="pagina instrumento-fijo">
      <div className="pagina-cabecera">
        <div>
          <span className="pagina-etiqueta"><Icon name="refuerzo" size={14} /> INSTRUMENTO INSTITUCIONAL</span>
          <h2><Icon name="encuesta" size={22} /> {instrumento?.titulo || 'Encuesta de Evaluación Docente'}</h2>
          <p className="subtitulo">Cuestionario fijo del sistema, administrado desde el backend.</p>
        </div>
        <span className="instrumento-fijo-insignia"><Icon name="verificado" size={16} /> Publicado y activo</span>
      </div>

      <div className="instrumento-resumen">
        <article><span className="instrumento-resumen-icono"><Icon name="encuesta" size={19} /></span><div><strong>{cuantitativas}</strong><small>preguntas de escala</small></div></article>
        <article><span className="instrumento-resumen-icono instrumento-resumen-texto"><Icon name="libro" size={19} /></span><div><strong>{abiertas}</strong><small>comentarios abiertos opcionales</small></div></article>
        <article><span className="instrumento-resumen-icono instrumento-resumen-seccion"><Icon name="grupoB" size={19} /></span><div><strong>{agrupadas.length}</strong><small>secciones temáticas</small></div></article>
        <article><span className="instrumento-resumen-icono instrumento-resumen-respuestas"><Icon name="usuarios" size={19} /></span><div><strong>{encuestas.length}</strong><small>encuestas respondidas</small></div></article>
      </div>

      <div className="instrumento-layout">
        <div className="instrumento-secciones">
          {agrupadas.map((seccion, si) => (
            <section className="instrumento-seccion" key={seccion.id}>
              <header className="instrumento-seccion-cabecera">
                <span className="instrumento-seccion-numero">{String(si + 1).padStart(2, '0')}</span>
                <div><h3>{seccion.titulo}</h3><p>{seccion.descripcion}</p></div>
                <span className="instrumento-seccion-cantidad">{seccion.preguntas.length} {seccion.preguntas.some((p) => p.tipo === 'texto') ? 'preguntas' : 'ítems'}</span>
              </header>
              <ol className="instrumento-preguntas">
                {seccion.preguntas.map((pregunta, i) => (
                  <li key={pregunta.id}>
                    <span className="instrumento-pregunta-numero">{String(i + 1).padStart(2, '0')}</span>
                    <p>{pregunta.texto}</p>
                    {pregunta.tipo === 'texto'
                      ? <span className="instrumento-tipo instrumento-tipo-abierta">Respuesta abierta · Opcional</span>
                      : <span className="instrumento-tipo">Escala 1–{escala.length}</span>}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <aside className="instrumento-lateral">
          <section className="instrumento-escala">
            <div className="instrumento-lateral-titulo"><span><Icon name="estrella" size={17} /></span><div><h3>Escala de evaluación</h3><p>Se aplica a las 24 preguntas cerradas.</p></div></div>
            <ol>{escala.map((opcion) => <li key={opcion.valor}><strong>{opcion.valor}</strong><span>{opcion.etiqueta}</span></li>)}</ol>
          </section>
          <section className="instrumento-nota">
            <Icon name="refuerzo" size={19} />
            <div><strong>Comentarios opcionales</strong><p>Las sugerencias abiertas no se incluyen en el promedio numérico.</p></div>
          </section>
          <section className="instrumento-nota instrumento-nota-anonima">
            <Icon name="usuarios" size={19} />
            <div><strong>Respuestas anónimas</strong><p>Los resultados se presentan de manera agregada para proteger la identidad del estudiante.</p></div>
          </section>
        </aside>
      </div>
    </section>
  );
}
