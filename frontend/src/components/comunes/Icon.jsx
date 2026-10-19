// ===== Iconos SVG inline (sin dependencias) =====
// Uso: <Icon name="docentes" size={20} />

const PATHS = {
  escuela: (
    <>
      <path d="M3 10 12 4l9 6" />
      <path d="M5 10v9h14v-9" />
      <path d="M9 19v-5h6v5" />
    </>
  ),
  libro: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M6 17h13" />
    </>
  ),
  encuesta: (
    <>
      <path d="M7 3h10l3 3v15H7z" />
      <path d="M10 11h7M10 15h7M10 7h3" />
    </>
  ),
  grafico: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  docentes: (
    <>
      <path d="M3 7h18M3 12h18M3 17h11" />
      <circle cx="18.5" cy="17" r="2.2" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 14.2A5.5 5.5 0 0 1 22 20" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  grupoA: (
    <>
      <circle cx="7" cy="8" r="2.6" />
      <circle cx="17" cy="8" r="2.6" />
      <path d="M1.5 19a5.5 5.5 0 0 1 11 0M11.5 19a5.5 5.5 0 0 1 11 0" />
    </>
  ),
  grupoB: (
    <>
      <rect x="3" y="4" width="7" height="7" rx="1" />
      <rect x="14" y="4" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  grupoC: (
    <>
      <path d="M4 17 10 7l6 10z" />
      <circle cx="18" cy="7" r="2.4" />
    </>
  ),
  grupoD: (
    <>
      <path d="M12 2.5 21 8v8l-9 5.5L3 16V8z" />
      <path d="M12 8v8M8 10v5M16 10v5" />
    </>
  ),
  buscar: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m19 19-4.2-4.2" />
    </>
  ),
  editar: (
    <>
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m14 6 4 4" />
    </>
  ),
  eliminar: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  activar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  desactivar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m7 7 10 10" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  enviar: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </>
  ),
  limpiar: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  actualizar: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </>
  ),
  estrella: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
  ),
  check: <path d="m4 12 5 5L20 6" />,
  alerta: (
    <>
      <path d="M12 3 2 21h20z" />
      <path d="M12 9v5M12 17.5v.5" />
    </>
  ),
  verificado: (
    <>
      <path d="m12 2 2.5 2.1 3.2-.3.9 3.1 2.7 1.8-1.2 3 1.2 3-2.7 1.8-.9 3.1-3.2-.3L12 22l-2.5-2.1-3.2.3-.9-3.1L2.7 13l1.2-3-1.2-3 2.7-1.8.9-3.1 3.2.3z" />
      <path d="m8.5 12 2.4 2.4 4.6-5" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  universidad: (
    <>
      <path d="M12 3 2 8h20z" />
      <path d="M5 8v8M10 8v8M14 8v8M19 8v8M2 20h20" />
      <path d="M9 5h6" />
    </>
  ),
  estrellaOpcion: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />,
  registro: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 3v4h8V3M8 12h8M8 16h5" />
    </>
  ),
  imprimir: (
    <>
      <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7zM17 11h.01" />
    </>
  ),
  refuerzo: (
    <>
      <path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  nocturno: (
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  ),
  online: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  verano: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  capacitacion: (
    <>
      <path d="M4 7h9v10H4z" />
      <path d="M13 10h7v7h-7zM8 17v3M17 17v3" />
    </>
  ),
  grupoE: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  subir: (
    <>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </>
  ),
  bajar: (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  flechaIzquierda: <path d="M19 12H5m7 7-7-7 7-7" />,
  flechaDerecha: <path d="M5 12h14m-7-7 7 7-7 7" />,
  ver: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
};

// Colores de énfasis por modalidad / grupo (tokens visuales)
export const ICONOS_MODALIDAD = {
  colegio: { icon: 'escuela', color: '#1e4e8c' },
  primera: { icon: 'estrella', color: '#b7791f' },
  ordinario: { icon: 'universidad', color: '#2c7a7b' },
  cepru: { icon: 'verificado', color: '#6b46c1' },
  ordinario_nocturno: { icon: 'nocturno', color: '#2d3748' },
  virtual: { icon: 'online', color: '#2b6cb0' },
  verano: { icon: 'verano', color: '#c05621' },
  capacitacion: { icon: 'capacitacion', color: '#4a5568' },
};

export const ICONOS_GRUPO = {
  A: 'grupoA',
  B: 'grupoB',
  C: 'grupoC',
  D: 'grupoD',
  otro: 'grupoE',
};

export default function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.8, className = '' }) {
  const path = PATHS[name] || PATHS.alerta;
  return (
    <svg
      className={`icono ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}
