import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import EstudianteApp from './EstudianteApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EstudianteApp />
  </StrictMode>
);
