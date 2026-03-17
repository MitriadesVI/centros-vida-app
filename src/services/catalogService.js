import {
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

const ESPACIOS_COLLECTION = 'espacios';
const STORAGE_KEY = 'espacios_catalogo';

export const getEspacios = async () => {
  const q = query(collection(db, ESPACIOS_COLLECTION), orderBy('nombre', 'asc'));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

export const getEspaciosFromCache = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const addEspacio = async ({ nombre, tipo }) => {
  const docRef = await addDoc(collection(db, ESPACIOS_COLLECTION), {
    nombre,
    tipo,
    activo: true,
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateEspacio = async (id, fields) => {
  await updateDoc(doc(db, ESPACIOS_COLLECTION, id), {
    ...fields,
    updatedAt: serverTimestamp()
  });
};

export const deleteEspacio = async (id) => {
  await deleteDoc(doc(db, ESPACIOS_COLLECTION, id));
};

// Firestore limita 500 operaciones por batch; dividimos en chunks si es necesario.
const BATCH_CHUNK_SIZE = 500;

export const importarEspaciosCSV = async (espaciosArray) => {
  const colRef = collection(db, ESPACIOS_COLLECTION);
  const chunks = [];
  for (let i = 0; i < espaciosArray.length; i += BATCH_CHUNK_SIZE) {
    chunks.push(espaciosArray.slice(i, i + BATCH_CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(({ nombre, tipo }) => {
      const newDocRef = doc(colRef);
      batch.set(newDocRef, {
        nombre,
        tipo,
        activo: true,
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  }
};
