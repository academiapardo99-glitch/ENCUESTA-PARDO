# Persistencia con Supabase

El backend puede guardar cursos, docentes, grupos y encuestas en Supabase en lugar
de `backend/data/db.json`. El frontend no habla con Supabase directamente: sigue
consumiendo la API (`/api/...`), así que **no hay claves en el navegador**.

```
[ Panel admin :5173 ]──┐
                       ├─► [ Backend Express :4000 ] ──REST──► [ Supabase (PostgreSQL) ]
[ Portal :5174 ]───────┘
```

## 1. Crear las tablas

En el proyecto de Supabase, abre **SQL Editor** y ejecuta el contenido de
[`worker/supabase-schema.sql`](worker/supabase-schema.sql). Crea:

| Tabla | Clave | Columnas principales |
|---|---|---|
| `cursos` | `id` | `nombre`, `grupoIds` (jsonb), `activo`, `creadoEn` |
| `docentes` | `id` | `nombre`, `cursoId`, `modalidadIds` (jsonb), `estado`, `codigo`… |
| `grupos` | `id` | `modalidadId`, `nombre`, `activo` (único por modalidad+nombre) |
| `encuestas` | `id` | ids y nombres congelados, `respuestas` (jsonb), `creadoEn` |

Las columnas van en camelCase para que lo que devuelve Supabase coincida con lo
que ya esperan los modelos y las páginas.

### Si el SQL Editor muestra «Backend error! Retry your query»

1. **Recarga la página** y vuelve a pegar el script completo: el error también
   aparece cuando el proyecto se suspende por inactividad y el editor pierde la
   conexión. Reentra a **SQL Editor → New query** antes de reintentar.
2. Pega el contenido **sin** las líneas que empiezan por `#` (son comentarios de
   la vista previa; el archivo real usa `--`).
3. Si insiste, ejecuta el script por partes en este orden: tablas, luego los
   bloques `do $$ ... $$;`. Un error en `create extension` (permiso denegado)
   suele indicar que estás en una base que no es la del proyecto.
4. Confirma el resultado con `worker/supabase-verificar.sql`: deben salir 4
   tablas (`cursos`, `docentes`, `grupos`, `encuestas`) y 4 políticas.

## 2. Configurar credenciales

1. Copia `backend/.env.example` a `backend/.env`.
2. Completa con **Settings → API** de Supabase:

```env
PERSISTENCIA=supabase
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor. Si se filtra, cualquiera
puede leer/escribir toda la base: no comprometas este archivo (`.env` ya está en
`.gitignore`).

## 3. Ejecutar

```bash
cd backend
npm run dev      # carga .env automáticamente (node --env-file-if-exists)
```

Al arrancar verás `Persistencia: Supabase`. Si falta alguna variable el proceso
termina con un mensaje claro en lugar de arrancar vacío.

Para volver al JSON local, borra `PERSISTENCIA` o pon `PERSISTENCIA=json`.

## 4. Verificar

Con la API en marcha:

```bash
node scripts/smoke-test-api.mjs http://localhost:4000
```

Comprueba salud, catálogo (cursos, docentes, 20 grupos), listado de encuestas y
un ciclo crear → editar → borrar de docente. Los cambios deben reflejarse en el
**Table Editor** de Supabase.

## 5. Portal público en Cloudflare Workers (opcional)

`worker/` contiene una API mínima (solo lectura del catálogo y alta de encuestas)
pensada para publicar el portal sin exponer el panel administrativo:

```bash
cd worker
npm install
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY     # service_role (o anon con la política de insert)
cd ../frontend-estudiante && npm run build
cd ../worker && npx wrangler deploy
```

El Worker sirve `frontend-estudiante/dist` como assets y atiende `/api/*`.

## Cómo funciona internamente

- `backend/src/db.js` mantiene la misma interfaz que antes (`db`, `leer`,
  `escribir`). Con `PERSISTENCIA=supabase` delega en `backend/src/supabase.js`.
- `supabase.js` carga las cuatro colecciones al arrancar y las mantiene en
  memoria. `escribir()` sube la colección completa con `Prefer:
  resolution=merge-duplicates` (upsert) y elimina en Supabase las filas que ya no
  existen, equivalente al reemplazo del archivo JSON.
- Las escrituras de los modelos son `async`; las lecturas (`listar...`) siguen
  siendo síncronas porque leen la caché ya cargada. El servidor espera
  `inicializarDb()` antes de abrir el puerto.
