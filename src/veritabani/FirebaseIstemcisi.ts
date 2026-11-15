import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const canliFirebaseAktifMi = (): boolean => {
  return Boolean(
    firebaseConfig.projectId &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.length > 10 &&
    firebaseConfig.apiKey.startsWith('AIza')
  );
};

let firebaseUygulamasi: any = null;
let firestoreDb: any = null;
let firebaseAuth: any = null;

if (canliFirebaseAktifMi()) {
  try {
    firebaseUygulamasi = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseUygulamasi, firebaseConfig.firestoreDatabaseId);
    firebaseAuth = getAuth(firebaseUygulamasi);
  } catch (baslatmaHatasi) {
    console.warn('Firebase canlı bağlantı başlatılamadı:', baslatmaHatasi);
  }
}

export const db = firestoreDb || ({} as any);
export const firebaseVeritabani = db;
export const auth = firebaseAuth || ({} as any);

async function baglantiTestiYap() {
  if (!canliFirebaseAktifMi() || !firestoreDb) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (hata) {
    if (hata instanceof Error && hata.message.includes('the client is offline')) {
      console.warn('Firebase çevrimdışı, lütfen yapılandırmanızı kontrol ediniz.');
    }
  }
}

if (typeof window !== 'undefined') {
  baglantiTestiYap();
}
