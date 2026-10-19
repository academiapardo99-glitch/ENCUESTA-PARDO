# Despliegue en Cloudflare + Supabase

Tres piezas, un solo proyecto de Supabase:

```
Estudiantes ──► Worker "encuesta-estudiantes"  (portal + /api pública)
                        │  clave anon (RLS: SELECT catálogo, INSERT encuestas)
                        ▼
                    SUPABASE (PostgreSQL)
                        ▲
Administrativos ► Cloudflare Pages (panel SPA) ──► API Express (Render/Docker)
                                                   clave service_role
```

El panel y el portal escriben **las mismas columnas** (`docenteId`, `creadoEn`,
`respuestas`…), así que las respuestas de los estudiantes se ven en el panel.

---

## 0. Supabase (una sola vez)

1. Abre el proyecto en <https://supabase.com/dashboard> → **SQL Editor** → pega
   y ejecuta `worker/supabase-schema.sql` completo.
2. Ejecuta `worker/supabase-verificar.sql`: deben salir **4 tablas** y
   **4 políticas**.
3. **Settings → API** → copia:
   - `Project URL` → `https://xxxxx.supabase.co` (**sin** `/rest/v1` final).
   - `anon` / `public` → la usa el Worker.
   - `service_role` → la usa la API del panel. **Nunca** la pongas en el
     frontend ni en Variables públicas: da acceso total a la base.

> Si el SQL Editor dice «Backend error!», revisa la página y vuelve a abrirlo:
> el proyecto se suspende por inactividad. Si el script falla a la mitad, es
> seguro volver a ejecutarlo (usa `if not exists` y `drop policy if exists`).

---

## 1. Portal del estudiante → Cloudflare Worker

Proyecto: **Workers & Pages → Create → Workers → Connect to Git** (o CLI).

| Ajuste | Valor |
|---|---|
| Repositorio | el tuyo |
| Directorio raíz (**Root directory**) | `worker` |
| Comando de compilación | `npm run build` (compila `frontend-estudiante`) |
| Comando de despliegue | `npx wrangler deploy` |
| Variable de compilación | `NODE_VERSION = 22` |

Después, en **Worker → Settings → Variables and Secrets** (producción **y**
preview) añade los secretos:

| Nombre | Tipo | Valor |
|---|---|---|
| `SUPABASE_URL` | Secret | `https://xxxxx.supabase.co` |
| `SUPABASE_KEY` | Secret | clave `anon` |
| `CORS_ORIGIN` | (opcional) | dominio del panel, si quieres restringirlo |

Con el portal y la API en el mismo Worker no necesitas CORS para el portal:
las peticiones a `/api/*` son al mismo dominio.

### Por CLI

```powershell
cd worker
npm install
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
cd ..
npm run deploy:worker        # compila el portal y ejecuta wrangler deploy
```

### Comprobar

```
https://encuesta-estudiantes.TU-SUBDOMINIO.workers.dev/api/salud
```
debe responder `{"ok":true,"supabaseConfigurado":true,...}`. Luego abre la raíz
del Worker, envía una encuesta de prueba y confírmala en Supabase →
**Table Editor → encuestas**.

**Errores frecuentes**

| Mensaje | Causa / solución |
|---|---|
| `could not determine executable to run` / `wrangler: not found` | Se desplegó desde la raíz. Usa `npx wrangler deploy --config worker/wrangler.jsonc` o configura el root en `worker`. |
| `Could not resolve "../frontend-estudiante/dist"` | Falta compilar el portal: el comando de build debe ser `npm run build` (o `npm run build:cloudflare` desde la raíz). |
| `Faltan SUPABASE_URL y SUPABASE_KEY` | Los secretos no están en el entorno desplegado (se añadieron en el local, no en Cloudflare). |
| `Supabase GET docentes 401/404` | La clave no es `anon` del mismo proyecto, o no se ejecutó `supabase-schema.sql`. |

---

## 2. Panel administrativo → Cloudflare Pages

Proyecto: **Workers & Pages → Create → Pages → Connect to Git**.

| Ajuste | Valor |
|---|---|
| Directorio raíz | *(vacío, `./`)* |
| Comando de compilación | `npm run build:cloudflare` |
| Directorio de salida | `dist-pages` |
| Variable de compilación | `VITE_API_URL = https://encuesta-estudiantes.TU-SUBDOMINIO.workers.dev/api` |

> El Worker atiende las lecturas que necesita el panel (`/api/docentes`,
> `/api/cursos`, `/api/grupos`, `/api/instrumento`, `GET /api/encuestas` y los
> listados completos `/api/docentes/todos` y `/api/cursos/todos`), así que con
> `VITE_API_URL` apuntando al Worker el panel **lee** sin depender de Render.
> Crear, editar y borrar docentes/cursos sigue necesitando la API Express:
> usa `https://URL-DE-LA-API/api` (Render) si el panel se usa también para
> editar. El Worker no expone escrituras del panel (solo alta de encuestas).

`npm run build:cloudflare` compila el panel (raíz del sitio) y el portal
(`/estudiante/`) y genera `dist-pages` con `_redirects` para que las recargas no
den 404. El resultado deja el panel en `https://TU-PANEL.pages.dev/` y la
encuesta también en `https://TU-PANEL.pages.dev/estudiante/`.

Si prefieres **dos proyectos Pages** separados:
- Panel: root `frontend`, build `npm run build`, salida `dist`, `VITE_API_URL=...`.
- Portal: root `frontend-estudiante`, build `npm run build`, salida `dist`,
  `VITE_API_URL=https://TU-WORKER.workers.dev/api`.

> `VITE_API_URL` se incrusta al compilar: **después de cambiarla hay que
> volver a desplegar** (Deployments → Retry deployment).

---

## 3. API del panel → Render / Docker

`render.yaml` ya define el servicio `encuesta-api` con `PERSISTENCIA=supabase`.
En el panel de Render → **Environment** completa:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` |
| `CORS_ORIGIN` | `https://TU-PANEL.pages.dev` (el dominio exacto; varios separados por coma) |

El servidor escucha en `0.0.0.0:$PORT`, verifica las 4 tablas antes de arrancar
y el log muestra `Persistencia: Supabase … cursos=…, docentes=…, grupos=…`.

### Comprobar

```powershell
node scripts/smoke-test-api.mjs https://URL-DE-LA-API
```

Hace salud, catálogo, 20 grupos y un ciclo crear → editar → borrar de docente.
Si falla con `No 'Access-Control-Allow-Origin'`, `CORS_ORIGIN` no coincide
exactamente con el dominio del panel (sin `/` final, con `https://`).

---

## Comprobar el Worker antes de subir nada

```powershell
npm --prefix frontend-estudiante run build   # o: npm run deploy:worker
node scripts/prueba-worker-supabase.mjs      # worker + Supabase simulado (sin red)
node scripts/prueba-supabase-simulado.mjs    # API Express + Supabase simulado
```

---

## Lista de verificación final

1. `GET /api/salud` del Worker → `ok: true` y `supabaseConfigurado: true`.
2. Portal: se ven cursos y docentes y una encuesta de prueba queda en
   `encuestas` de Supabase.
3. `GET https://URL-API/api/salud` → `persistencia: "supabase"`.
4. Panel en Pages: lista los docentes y **las encuestas del portal aparecen en
   Encuestas/Estadísticas**.
5. Recargar una ruta del panel (`F5`) no devuelve 404.

> Nota de seguridad: la API del panel todavía no tiene autenticación. Protégela
> con **Cloudflare Access** (Zero Trust → Access → Applications) apuntando al
> dominio del panel y, si es posible, a `URL-API/api`.
