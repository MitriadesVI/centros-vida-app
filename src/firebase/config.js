import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDJNUTRyqviMzGGyLzAZqMigJQXQoc5Iek",
  authDomain: "supervision-centros-de-vida.firebaseapp.com",
  projectId: "supervision-centros-de-vida",
  storageBucket: "supervision-centros-de-vida.firebasestorage.app",
  messagingSenderId: "621844251506",
  appId: "1:621844251506:web:0fd7552f46528495dbd3eb",
  measurementId: "G-MCH3JEBFQJ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;