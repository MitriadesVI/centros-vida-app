// src/services/dbService.js
import Dexie from 'dexie';

// 1. Definimos la base de datos y su versión
export const db = new Dexie('centrosVidaDB');

// 2. Definimos la estructura (schema) de nuestras tablas - ACTUALIZADA PARA INCLUIR SESIÓN DE USUARIO
db.version(2).stores({
  forms: '++id, status, lastUpdated', // ++id: auto-incrementado, status y lastUpdated: campos indexados para búsquedas rápidas
  userSession: '&id' // '&id' significa que el id es único. Solo guardaremos un objeto de sesión.
}).upgrade(tx => {
  // Código de migración si es necesario en el futuro.
  // Por ahora, solo actualizamos la versión.
});

/**
 * Guarda o actualiza un formulario en la base de datos local.
 * Siempre se guarda como 'borrador'.
 * @param {object} formData - Los datos completos del formulario.
 * @param {string|null} existingId - El ID del formulario si ya existe.
 * @returns {string} El ID del formulario guardado.
 */
export const saveFormAsDraft = async (formData, existingId) => {
  const dataToSave = {
    status: 'borrador',
    lastUpdated: new Date().toISOString(),
    ...formData
  };

  if (existingId) {
    // Si ya existe un ID, actualizamos el registro existente
    await db.forms.put({ id: existingId, ...dataToSave });
    return existingId;
  } else {
    // Si no hay ID, creamos un nuevo registro y Dexie generará el ID
    const newId = await db.forms.add(dataToSave);
    return newId;
  }
};

/**
 * Obtiene un formulario por su ID.
 * @param {string} id - El ID del formulario.
 * @returns {object|null} El formulario encontrado.
 */
export const getForm = async (id) => {
  if (!id) return null;
  return await db.forms.get(id);
};

/**
 * Obtiene todos los formularios guardados, ordenados por fecha de actualización.
 * @returns {Array} Una lista de todos los formularios.
 */
export const getAllForms = async () => {
  return await db.forms.orderBy('lastUpdated').reverse().toArray();
};

/**
 * Elimina un formulario de la base de datos local.
 * @param {string} id - El ID del formulario a eliminar.
 */
export const deleteForm = async (id) => {
  await db.forms.delete(id);
};

/**
 * Marca un formulario como 'finalizado'.
 * Este es el paso previo a enviarlo como oficial a Firebase.
 * @param {string} id - El ID del formulario a finalizar.
 */
export const finalizeForm = async (id) => {
  await db.forms.update(id, { status: 'finalizado' });
};

/**
 * << NUEVAS FUNCIONES PARA GESTIONAR LA SESIÓN LOCAL DEL USUARIO >>
 */

/**
 * Guarda los datos de la sesión del usuario localmente.
 * @param {object} sessionData - Datos del usuario (uid, email, role).
 */
export const saveUserSession = async (sessionData) => {
  // Usamos un ID fijo (0) porque solo habrá una sesión activa a la vez.
  await db.userSession.put({ id: 0, ...sessionData });
};

/**
 * Obtiene los datos de la sesión del usuario guardada localmente.
 * @returns {object|null} Los datos de la sesión o null si no existe.
 */
export const getUserSession = async () => {
  return await db.userSession.get(0);
};

/**
 * Borra la sesión del usuario del almacenamiento local.
 */
export const clearUserSession = async () => {
  await db.userSession.clear();
};