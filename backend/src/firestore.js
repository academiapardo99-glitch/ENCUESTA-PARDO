import { Firestore } from '@google-cloud/firestore';

let cliente;

function firestore() {
  if (!cliente) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    cliente = new Firestore(projectId ? { projectId } : {});
  }
  return cliente;
}

export async function guardarEncuestaFirestore(encuesta) {
  await firestore().collection('encuestas').doc(encuesta.id).create(encuesta);
}
