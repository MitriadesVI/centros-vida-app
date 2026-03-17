import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser } from './authService';

const TAREAS_COLLECTION = 'tareasVisita';
const ESPACIOS_COLLECTION = 'espacios';
const FORM_SUMMARIES_COLLECTION = 'formSummaries';

const ESTADOS = {
  PENDIENTE: 'pendiente',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada'
};

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const parseDateString = (fechaStr) => {
  if (typeof fechaStr !== 'string' || fechaStr.length < 10) {
    return null;
  }

  const [year, month, day] = fechaStr.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateString = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const requireCurrentUser = () => {
  const currentUser = getCurrentUser();

  if (!currentUser?.uid) {
    throw new Error('Usuario no autenticado');
  }

  return currentUser;
};

const mapSnapshot = (snapshot) => snapshot.docs.map((snapshotDoc) => ({
  id: snapshotDoc.id,
  ...snapshotDoc.data()
}));

const isNotCancelled = (tarea) => tarea?.estado !== ESTADOS.CANCELADA;

const deriveVigencia = (fechaStr) => {
  const yearFromString = typeof fechaStr === 'string'
    ? Number(fechaStr.slice(0, 4))
    : NaN;

  if (!Number.isNaN(yearFromString) && yearFromString > 1900) {
    return yearFromString;
  }

  const parsedDate = parseDateString(fechaStr) || (fechaStr ? new Date(fechaStr) : null);
  if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getFullYear();
  }

  return new Date().getFullYear();
};

const obtenerRangoSemana = (fechaStr) => {
  const parsedDate = parseDateString(fechaStr);

  if (!parsedDate) {
    return { lunes: '', domingo: '' };
  }

  const monday = new Date(parsedDate);
  const dayOfWeek = monday.getDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(monday.getDate() + offsetToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    lunes: formatDateString(monday),
    domingo: formatDateString(sunday)
  };
};

const getTaskRef = (tareaId) => doc(db, TAREAS_COLLECTION, tareaId);

const getOwnedTask = async (tareaId) => {
  const currentUser = requireCurrentUser();
  const tareaRef = getTaskRef(tareaId);
  const tareaSnap = await getDoc(tareaRef);

  if (!tareaSnap.exists()) {
    throw new Error('La tarea no existe');
  }

  const tarea = { id: tareaSnap.id, ...tareaSnap.data() };

  if (tarea.userId !== currentUser.uid) {
    throw new Error('No tienes permisos para modificar esta tarea');
  }

  return { tarea, tareaRef, currentUser };
};

export const crearTarea = async (datosTarea) => {
  const currentUser = requireCurrentUser();

  if (!datosTarea?.espacioId || !datosTarea?.espacioNombre || !datosTarea?.fechaProgramada) {
    throw new Error('Faltan datos obligatorios para crear la tarea');
  }

  const payload = {
    espacioId: datosTarea.espacioId,
    espacioNombre: String(datosTarea.espacioNombre).trim(),
    tipoEspacio: datosTarea.tipoEspacio || '',
    fechaProgramada: datosTarea.fechaProgramada,
    userId: currentUser.uid,
    userEmail: currentUser.email || '',
    estado: ESTADOS.PENDIENTE,
    vigencia: deriveVigencia(datosTarea.fechaProgramada),
    notas: String(datosTarea.notas || '').trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    creadoPor: currentUser.uid,
    formSummaryId: null
  };

  const docRef = await addDoc(collection(db, TAREAS_COLLECTION), payload);
  return docRef.id;
};

export const validarDuplicadoSemanal = async (espacioId, fechaProgramada) => {
  const currentUser = requireCurrentUser();
  const { lunes, domingo } = obtenerRangoSemana(fechaProgramada);

  if (!espacioId || !lunes || !domingo) {
    return { bloqueado: false, tareaExistente: null };
  }

  const q = query(
    collection(db, TAREAS_COLLECTION),
    where('userId', '==', currentUser.uid),
    where('espacioId', '==', espacioId),
    where('fechaProgramada', '>=', lunes),
    where('fechaProgramada', '<=', domingo),
    orderBy('fechaProgramada', 'asc')
  );

  const snapshot = await getDocs(q);
  const tareas = mapSnapshot(snapshot).filter(isNotCancelled);

  return {
    bloqueado: tareas.length > 0,
    tareaExistente: tareas[0] || null
  };
};

export const detectarChoque = async (espacioId, fechaProgramada) => {
  const currentUser = requireCurrentUser();

  if (!espacioId || !fechaProgramada) {
    return { hayChoque: false, tareasConflicto: [] };
  }

  const q = query(
    collection(db, TAREAS_COLLECTION),
    where('espacioId', '==', espacioId),
    where('fechaProgramada', '==', fechaProgramada)
  );

  const snapshot = await getDocs(q);
  const tareasConflicto = mapSnapshot(snapshot).filter((tarea) => (
    tarea.userId !== currentUser.uid && isNotCancelled(tarea)
  ));

  return {
    hayChoque: tareasConflicto.length > 0,
    tareasConflicto
  };
};

export const obtenerTareasPorRango = async (fechaInicio, fechaFin) => {
  if (!fechaInicio || !fechaFin) {
    return [];
  }

  const q = query(
    collection(db, TAREAS_COLLECTION),
    where('fechaProgramada', '>=', fechaInicio),
    where('fechaProgramada', '<=', fechaFin),
    orderBy('fechaProgramada', 'asc')
  );

  const snapshot = await getDocs(q);
  return mapSnapshot(snapshot);
};

export const obtenerEspaciosSinVisitar = async () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0, 0);
  const primerDiaMes = formatDateString(firstDay);
  const ultimoDiaMes = formatDateString(lastDay);

  const [espaciosSnap, visitasSnap, tareasSnap] = await Promise.all([
    getDocs(query(
      collection(db, ESPACIOS_COLLECTION),
      where('activo', '==', true),
      orderBy('nombre', 'asc')
    )),
    getDocs(query(
      collection(db, FORM_SUMMARIES_COLLECTION),
      where('fechaVisita', '>=', primerDiaMes),
      where('fechaVisita', '<=', ultimoDiaMes),
      orderBy('fechaVisita', 'asc')
    )),
    getDocs(query(
      collection(db, TAREAS_COLLECTION),
      where('estado', '==', ESTADOS.PENDIENTE),
      where('fechaProgramada', '>=', primerDiaMes),
      where('fechaProgramada', '<=', ultimoDiaMes),
      orderBy('fechaProgramada', 'asc')
    ))
  ]);

  const espacios = mapSnapshot(espaciosSnap);
  const visitas = mapSnapshot(visitasSnap);
  const tareasPendientes = mapSnapshot(tareasSnap);

  const visitedByName = new Map();
  visitas.forEach((visita) => {
    const key = normalizeName(visita.espacioAtencion);
    if (!key) {
      return;
    }

    const currentVisit = visitedByName.get(key);
    if (!currentVisit || (visita.fechaVisita || '') > (currentVisit.fechaVisita || '')) {
      visitedByName.set(key, visita);
    }
  });

  const pendingByName = new Map();
  tareasPendientes.forEach((tarea) => {
    const key = normalizeName(tarea.espacioNombre);
    if (!key) {
      return;
    }

    const currentTask = pendingByName.get(key);
    if (!currentTask || (tarea.fechaProgramada || '') < (currentTask.fechaProgramada || '')) {
      pendingByName.set(key, tarea);
    }
  });

  const visitados = [];
  const conTareaPendiente = [];
  const sinVisitarSinTarea = [];

  espacios.forEach((espacio) => {
    const key = normalizeName(espacio.nombre);
    const visita = visitedByName.get(key) || null;
    const tarea = pendingByName.get(key) || null;

    if (visita) {
      visitados.push({
        ...espacio,
        ultimaVisita: visita.fechaVisita || '',
        ultimaVisitaId: visita.id
      });
      return;
    }

    if (tarea) {
      conTareaPendiente.push({
        ...espacio,
        tareaPendienteId: tarea.id,
        tareaPendienteFecha: tarea.fechaProgramada || '',
        tareaPendienteUserEmail: tarea.userEmail || ''
      });
      return;
    }

    sinVisitarSinTarea.push(espacio);
  });

  return {
    totalEspacios: espacios.length,
    visitados,
    conTareaPendiente,
    sinVisitarSinTarea
  };
};

export const cancelarTarea = async (tareaId) => {
  const { tarea, tareaRef } = await getOwnedTask(tareaId);

  if (tarea.estado === ESTADOS.CANCELADA) {
    return;
  }

  await updateDoc(tareaRef, {
    estado: ESTADOS.CANCELADA,
    updatedAt: serverTimestamp()
  });
};

export const completarTarea = async (tareaId, formSummaryId) => {
  const { tareaRef } = await getOwnedTask(tareaId);

  await updateDoc(tareaRef, {
    estado: ESTADOS.COMPLETADA,
    formSummaryId: formSummaryId || null,
    updatedAt: serverTimestamp()
  });
};

export const buscarTareaPendienteParaVisita = async (espacioNombre, fechaVisita, userId) => {
  if (!fechaVisita || !userId) {
    return null;
  }

  const normalizedTargetName = normalizeName(espacioNombre);
  const q = query(
    collection(db, TAREAS_COLLECTION),
    where('userId', '==', userId),
    where('fechaProgramada', '==', fechaVisita),
    where('estado', '==', ESTADOS.PENDIENTE)
  );

  const snapshot = await getDocs(q);
  const tarea = mapSnapshot(snapshot).find((item) => normalizeName(item.espacioNombre) === normalizedTargetName);

  return tarea?.id || null;
};

export const editarNotasTarea = async (tareaId, notas) => {
  const { tareaRef } = await getOwnedTask(tareaId);

  await updateDoc(tareaRef, {
    notas: String(notas || '').trim(),
    updatedAt: serverTimestamp()
  });
};

export { ESTADOS };

const tareasService = {
  crearTarea,
  validarDuplicadoSemanal,
  detectarChoque,
  obtenerTareasPorRango,
  obtenerEspaciosSinVisitar,
  cancelarTarea,
  completarTarea,
  buscarTareaPendienteParaVisita,
  editarNotasTarea,
  ESTADOS
};

export default tareasService;
