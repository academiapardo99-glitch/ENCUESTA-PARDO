# API de Encuestas Académicas

API REST en Node.js + Express. En desarrollo usa JSON local (`data/db.json`); el portal público puede guardar respuestas en Firestore.

## Requisitos

- Node.js 20 o superior

## Puesta en marcha

```bash
cd backend
npm install
npm run dev     # modo desarrollo con recarga automática (puerto 4000)
npm start       # modo producción
```

Variables de entorno opcionales:

| Variable      | Descripción                             | Valor por defecto                             |
| ------------- | --------------------------------------- | --------------------------------------------- |
| `PORT`        | Puerto del servidor                     | `4000`                                        |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma | `http://localhost:5173,http://127.0.0.1:5173` |
| `PERSISTENCIA` | Almacenamiento de respuestas           | `local`                                       |

## Modelo de datos

- **Curso**: `nombre` y `grupoIds` (grupos a los que pertenece).
- **Docente**: `nombre`, `cursoId` y `modalidadIds` (modalidades que enseña).
- **Grupo**: combinación `modalidadId` × `nombre` (A, B, C o D). Siempre 16.
- **Encuesta**: respuestas anónimas `{ [preguntaId]: 1..5 }` con nombres congelados.

Para producción en Cloud Run, configura `PERSISTENCIA=firestore` y asigna a la identidad de servicio el rol `roles/datastore.user`. El servidor usa Application Default Credentials; no guardes claves de cuentas de servicio en el repositorio.

## Endpoints

| Método | Ruta                      | Descripción                     |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/api/salud`              | Estado del servicio             |
| GET    | `/api/docentes`           | Lista de docentes               |
| POST   | `/api/docentes`           | Crea un docente                 |
| PUT    | `/api/docentes/:id`       | Actualiza un docente            |
| DELETE | `/api/docentes/:id`       | Elimina un docente              |
| GET    | `/api/cursos`             | Lista de cursos                 |
| POST   | `/api/cursos`             | Crea un curso                   |
| PUT    | `/api/cursos/:id`         | Actualiza un curso              |
| DELETE | `/api/cursos/:id`         | Elimina un curso                |
| GET    | `/api/grupos`             | Los 16 grupos (modalidad × A–D) |
| PATCH  | `/api/grupos/:id`         | Activa/desactiva un grupo       |
| GET    | `/api/encuestas`          | Lista de encuestas              |
| POST   | `/api/encuestas`          | Registra una encuesta           |
| GET    | `/api/encuestas/catalogo` | Modalidades y grupos base       |

## Notas de despliegue

Si existe `frontend/dist`, el servidor también sirve el SPA y redirige
cualquier ruta que no empiece por `/api` hacia `index.html`.
