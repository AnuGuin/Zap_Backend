import admin from 'firebase-admin';
import { Auth } from 'firebase-admin/auth';
import { env } from './env';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // applicationDefault() looks for the credentials created by 'gcloud auth application-default login'
      credential: admin.credential.applicationDefault(),
      projectId: env.GOOGLE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const firebaseAuth: Auth = admin.auth();
export default admin;
