#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-}"
REGION="southamerica-west1"
SERVICE="encuesta-estudiantes"
SERVICE_ACCOUNT="encuesta-estudiantes-runtime"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Uso: bash scripts/desplegar-estudiantes-cloud-run.sh ID_DEL_PROYECTO" >&2
  exit 2
fi

gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q . || {
  echo "Inicia sesión primero con: gcloud auth login" >&2
  exit 1
}

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  --project "$PROJECT_ID"

if ! gcloud firestore databases describe --database='(default)' --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud firestore databases create \
    --database='(default)' \
    --location="$REGION" \
    --type=firestore-native \
    --project "$PROJECT_ID"
fi

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT" \
    --display-name="Encuesta pública de estudiantes" \
    --project "$PROJECT_ID"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/datastore.user" \
  --quiet

if [ ! -s backend/data/portal-seed.json ] || ! grep -q '"docentes": \[\s*{' backend/data/portal-seed.json; then
  echo "AVISO: backend/data/portal-seed.json no tiene docentes; los estudiantes no podrán evaluar a nadie." >&2
  echo "       Ejecuta antes:  node scripts/exportar-catalogo-portal.mjs" >&2
fi

# El build de frontend-estudiante usa VITE_BASE durante la compilación dentro
# de Cloud Build (Dockerfile). Sin él, los assets apuntan a /estudiante/ y el
# portal queda en blanco al servirse en la raíz del dominio.
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --service-account "$SERVICE_ACCOUNT_EMAIL" \
  --set-env-vars="PORTAL_ESTUDIANTE_PUBLICO=true,PERSISTENCIA=firestore,GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-build-env-vars="VITE_BASE=/" \
  --memory=512Mi \
  --allow-unauthenticated

URL=$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')
echo ""
echo "Portal publicado en: $URL"
echo "Comprueba la URL, /api/salud y envía una respuesta de prueba."
