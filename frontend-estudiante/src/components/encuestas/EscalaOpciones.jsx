import Icon from '../comunes/Icon.jsx';
import { escalar } from '../../services/dataService.js';

// Escala 1–10 con etiquetas verbales, reutilizable en cada pregunta.
export default function EscalaOpciones({ preguntaId, preguntaTexto, valor, onChange }) {
  return (
    <div className="opciones" role="radiogroup" aria-label={preguntaTexto || preguntaId}>
      {escalar.map((op) => {
        const elegida = valor === op.valor;
        return (
          <label key={op.valor} className={`opcion ${elegida ? 'opcion-elegida' : ''}`}>
            <input
              type="radio"
              name={preguntaId}
              value={op.valor}
              aria-label={`${op.valor}: ${op.etiqueta}`}
              checked={elegida}
              onChange={() => onChange(preguntaId, op.valor)}
            />
            <Icon name="estrella" size={16} />
            <strong>{op.valor}</strong>
            <small>{op.etiqueta}</small>
          </label>
        );
      })}
    </div>
  );
}
