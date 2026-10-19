# Publicar la encuesta para estudiantes

El despliegue publica solo el frontend de estudiantes. El panel administrativo no se empaqueta. La API pública permite leer un catálogo acotado y registrar una respuesta; bloquea las operaciones de administración y la lectura del historial.

Las respuestas se guardan como documentos separados en Firestore. El servicio usa su identidad de ejecución de Cloud Run, sin archivos de credenciales dentro del repositorio. Cloud Run y Firestore se configuran en `southamerica-west1` (Santiago, Chile).

## Requisitos

- Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/projectcreate) y vincularle una cuenta de facturación.
- Instalar [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) e iniciar sesión con `gcloud auth login`.
- Tener permisos para habilitar APIs, crear una base Firestore, crear cuentas de servicio y desplegar Cloud Run en ese proyecto.

## Preparar el catálogo

El portal estudiante solo muestra docentes y cursos que estén en `backend/data/portal-seed.json`. El archivo se mantiene limpio por defecto. Primero, inicia el backend y el panel administrativo local y registra el catálogo real. Luego, desde la raíz del proyecto, exporta únicamente los campos que necesita el portal:

```bash
node scripts/exportar-catalogo-portal.mjs
```

El exportador incluye cursos y docentes activos, junto con los grupos; no exporta respuestas, correos ni historial. Revisa `backend/data/portal-seed.json` antes de publicar. Si queda vacío, la página se desplegará pero los estudiantes no tendrán docentes para seleccionar.

## Desplegar

Desde la raíz del repositorio:

```bash
bash scripts/desplegar-estudiantes-cloud-run.sh ID_DEL_PROYECTO
```

El script habilita las APIs necesarias, crea la base Firestore predeterminada en Santiago si aún no existe, crea una cuenta de servicio con acceso de usuario a Firestore y publica el portal como servicio público. Al finalizar, Cloud Run muestra la URL para compartir con los estudiantes.

El contenedor incluye el catálogo depurado de `backend/data/portal-seed.json`. Para publicar cambios de cursos o docentes, vuelve a exportar el catálogo y despliega una revisión nueva.

Las respuestas que ya estén en `backend/data/db.json` permanecen intactas en tu equipo, pero no se importan automáticamente. El primer despliegue empieza con Firestore vacío y conserva las respuestas que envíen los estudiantes desde ese momento.

## Ejecución local

```bash
docker build -t encuesta-estudiantes .
docker run --rm -e PERSISTENCIA=local -p 8080:8080 encuesta-estudiantes
```

Abre `http://localhost:8080`. Para enviar respuestas localmente sin Google Cloud, configura `PERSISTENCIA=local`; la base JSON local se usa por defecto fuera del contenedor.

Google Drive puede almacenar los archivos, pero no servir una aplicación web interactiva. Este despliegue usa Cloud Run para el portal y Firestore para conservar las respuestas.
