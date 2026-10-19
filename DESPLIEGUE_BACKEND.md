# Despliegue del backend administrativo

El Worker `encuesta-estudiantes` atiende el portal público y consulta Supabase.
El servicio definido en `render.yaml` publica el backend Express para el panel
administrativo y usa el mismo proyecto Supabase.

> Guía completa de Cloudflare Workers + Cloudflare Pages + Supabase:
> [DESPLIEGUE_CLOUDFLARE.md](DESPLIEGUE_CLOUDFLARE.md).

## 1. Crear el servicio en Render

1. Sube estos cambios al repositorio de GitHub.
2. En Render, crea un **Blueprint** y selecciona el repositorio. Render detecta
   `render.yaml` en la raíz y prepara `encuesta-api`.
3. Configura las variables que Render solicita:
   - `SUPABASE_URL`: URL del mismo proyecto Supabase que usa el Worker.
   - `SUPABASE_SERVICE_ROLE_KEY`: clave secreta del servidor; no la clave `anon`.
   - `CORS_ORIGIN`: origen exacto del panel de Cloudflare Pages, por ejemplo
     `https://nombre-del-panel.pages.dev` (sin `/` final).
4. Espera el despliegue y comprueba `https://URL-DE-RENDER/api/salud`.

El backend usa `PERSISTENCIA=supabase`. No usa `backend/data/db.json` en Render.

## 2. Conectar el panel

En el proyecto de Cloudflare Pages (raíz del repositorio), establece:

- Directorio raíz: *(vacío, `./`)*
- Comando de compilación: `npm run build:cloudflare`
- Directorio de salida: `dist-pages`
- Variable de compilación `VITE_API_URL`: `https://URL-DE-RENDER/api`

El script compila el panel (en `/`) y el portal del estudiante (en
`/estudiante/`). Alternativa de un solo panel: raíz `frontend`, compilación
`npm run build`, salida `dist`.

Después de guardar `VITE_API_URL`, vuelve a desplegar Pages. Actualiza
`CORS_ORIGIN` en Render con el dominio público exacto de Pages.

## Acceso del panel

El backend actual no implementa inicio de sesión ni autorización. CORS solo
controla qué páginas pueden leer respuestas en un navegador; no impide que otras
personas llamen la API directamente. Antes de usar el panel administrativo con
datos reales, protégelo con autenticación (por ejemplo, Cloudflare Access para
el panel y la API) o incorpora autenticación en la aplicación.
