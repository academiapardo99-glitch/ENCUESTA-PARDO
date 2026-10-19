# Sistema de Gestión de Docentes y Encuestas Académicas

Monorepo fullstack con frontend (React + Vite) y backend (Node.js + Express).

```
Encuesta/
├── frontend/   # SPA en React + Vite
├── frontend-estudiante/ # Encuesta pública para estudiantes
├── backend/    # API REST + persistencia JSON local / Supabase
├── worker/     # API pública (Cloudflare Workers) + esquema SQL de Supabase
└── scripts/    # Exportación del catálogo, despliegue y prueba de humo de la API
```

## Arquitectura

```
[ Navegador ]
      │  HTTP  /api/*
      ▼
[ Frontend · Vite :5173 ]  ──proxy──►  [ Backend · Express :4000 ]
                                              │
                             ┌────────────────┴───────────────┐
                             ▼                                ▼
                    data/db.json local               Supabase (PostgreSQL)
                                                     PERSISTENCIA=supabase
```

- **Frontend**: React 18 + Vite. Toda la app consume datos mediante
  `AppDataContext`, que a su vez usa la capa de servicios
  (`src/services/dataService.js`) sobre el cliente HTTP (`src/api/cliente.js`).
- **Backend**: Express con rutas REST por colección. Sin `PERSISTENCIA` usa el
  archivo JSON; con `PERSISTENCIA=supabase` guarda todo en Supabase. El frontend
  nunca habla con Supabase: solo con la API.

## Puesta en marcha

### Conectar con Supabase

1. Ejecuta [`worker/supabase-schema.sql`](worker/supabase-schema.sql) en el SQL
   Editor de Supabase para crear `cursos`, `docentes`, `grupos` y `encuestas`.
2. Copia `backend/.env.example` a `backend/.env` y completa `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` (clave secreta, solo servidor).
3. `npm run dev` en `backend/` carga el `.env` y muestra `Persistencia: Supabase`.
4. Verifica con `node scripts/smoke-test-api.mjs http://localhost:4000`.

Los detalles (portal público, RLS, Worker) están en [SUPABASE.md](SUPABASE.md).

La configuración para publicar el backend administrativo y conectarlo con el
panel está en [DESPLIEGUE_BACKEND.md](DESPLIEGUE_BACKEND.md).

La guía completa para publicar el portal de estudiantes está en [DESPLIEGUE_GOOGLE.md](DESPLIEGUE_GOOGLE.md). Google Drive puede guardar los archivos, pero no servir la aplicación interactiva como web.

### Publicar el portal de estudiantes

El portal público se publica en Google Cloud Run. Cloud Run sirve el frontend y una API limitada; Firestore conserva cada respuesta. El panel administrativo no se publica.

1. Ejecuta el backend y el panel administrativo localmente (instrucciones abajo) y registra los cursos y docentes reales.
2. Desde la raíz del proyecto, genera el catálogo público depurado a partir de `backend/data/db.json`:

   ```bash
   node scripts/exportar-catalogo-portal.mjs
   ```

   El archivo `backend/data/portal-seed.json` solo incluye cursos, docentes activos y grupos; excluye correos, encuestas e historial. Revisa el resultado antes de desplegar. Si el catálogo cambia después, vuelve a exportarlo y despliega una nueva revisión.
3. Crea un proyecto de Google Cloud, vincula facturación e instala Google Cloud CLI. Inicia sesión y selecciona el ID del proyecto:

   ```bash
   gcloud auth login
   gcloud config set project ID_DEL_PROYECTO
   ```

4. Desde la raíz del proyecto, publica el sitio:

   ```bash
   bash scripts/desplegar-estudiantes-cloud-run.sh ID_DEL_PROYECTO
   ```

   El script activa las APIs, crea Firestore y la cuenta de servicio con permiso de escritura, y despliega el servicio público en `southamerica-west1`. Al terminar, copia la URL de Cloud Run y compártela con los estudiantes.
5. Comprueba que la URL abre la encuesta, que `/api/salud` responde `{"ok":true,...}` y que `/api/cursos` y `/api/docentes` devuelven el catálogo esperado. Envía una respuesta de prueba y confirma que aparece en Firestore, en la colección `encuestas`.

La aplicación requiere cursos y docentes activos en `portal-seed.json`; si el archivo está vacío, el portal abrirá pero no permitirá evaluar a un docente. Las respuestas previas de `db.json` no se migran: Firestore conserva los envíos hechos desde el despliegue.

Para actualizar la web o el catálogo, repite la exportación si cambió el catálogo y vuelve a ejecutar el script de despliegue. La guía explica requisitos y ejecución local.

Se necesitan dos terminales para el desarrollo local.

**1. Backend**

```bash
cd backend
npm install
npm run dev          # API en http://localhost:4000
```

**2. Frontend**

```bash
cd frontend
npm install
npm run dev          # SPA en http://localhost:5173
```

El frontend usa un proxy de Vite hacia `http://localhost:4000` para las rutas
`/api`, así que no hay problemas de CORS en desarrollo. Si la API corre en otro
puerto, ajusta `VITE_API_PROXY` o `VITE_API_URL`.

La encuesta pública para estudiantes se ejecuta del mismo modo desde
`frontend-estudiante/` (puerto indicado en su `vite.config.js`).

## Modelo de datos

| Entidad | Campos relevantes |
|---|---|
| **Curso** | `nombre`, `grupoIds` (grupos a los que pertenece) |
| **Docente** | `nombre`, `cursoId`, `modalidadIds` (modalidades que enseña) |
| **Grupo** | `modalidadId` × `nombre` (A, B, C o D) — siempre 16 |
| **Encuesta** | `respuestas { [preguntaId]: 1..10 }`, ids y nombres congelados |

Modalidades: **Colegio**, **Primera Opción**, **Primera Opción Avanzado**,
**Ordinario** y **Ordinario Cepru**. Cada una se divide en los grupos
**A, B, C y D** (5 × 4 = 20 grupos).

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud` | Estado del servicio |
| GET/POST/PUT/DELETE | `/api/docentes[/:id]` | CRUD de docentes |
| GET/POST/PUT/DELETE | `/api/cursos[/:id]` | CRUD de cursos |
| GET | `/api/grupos` | Los 20 grupos |
| PATCH | `/api/grupos/:id` | Activa/desactiva un grupo |
| GET/POST | `/api/encuestas` | Lista / registra encuestas |
| GET | `/api/encuestas/catalogo` | Modalidades y grupos base |

## Compilación de producción

```bash
cd frontend && npm run build     # genera frontend/dist
cd ../backend && npm start       # sirve la API y el SPA en el mismo puerto
```

Cuando existe `frontend/dist`, el backend también sirve la SPA y redirige las
rutas que no empiezan por `/api` hacia `index.html`.

## Notas de la migración

La capa de servicios del frontend conserva **exactamente la misma interfaz
asíncrona** que la versión anterior basada en `localStorage`
(`listar`, `crear`, `actualizar`, `eliminar`, `sincronizar`), por lo que
páginas y componentes no requirieron cambios de lógica. El respaldo de la
implementación anterior queda en
`frontend/src/services/dataService.localStorage.bak.js`.

El backend normaliza registros heredados: acepta `nombres`/`apellidos` además
de `nombre`, y `modalidadIds` en cursos además de `grupoIds`.
