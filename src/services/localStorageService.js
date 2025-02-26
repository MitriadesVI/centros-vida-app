/**
 * Servicio para manejar el almacenamiento local de los formularios
 */

// Clave principal para el almacenamiento
const STORAGE_KEY = 'centros_vida_supervision_data';
const FORMS_LIST_KEY = 'centros_vida_supervision_forms';

/**
 * Guarda el estado actual del formulario en localStorage
 * @param {Object} formData - Datos completos del formulario
 * @param {string} formId - Identificador único del formulario (si no se proporciona, se usará la fecha actual)
 */
export const saveFormToLocalStorage = (formData, formId = null) => {
  try {
    // Usar la fecha actual como identificador si no se proporciona uno
    const id = formId || `form_${new Date().toISOString()}`;
    
    // Crear o actualizar el objeto del formulario con metadatos
    const formObject = {
      id,
      data: formData,
      lastUpdated: new Date().toISOString(),
      status: 'draft' // Posibles estados: draft, complete, synced
    };
    
    // Guardar el formulario individual
    localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify(formObject));
    
    // Actualizar la lista de formularios
    updateFormsList(id, formObject);
    
    return id;
  } catch (error) {
    console.error('Error al guardar en localStorage:', error);
    return null;
  }
};

/**
 * Actualiza la lista de formularios guardados
 * @param {string} formId - ID del formulario
 * @param {Object} formMetadata - Metadatos del formulario
 */
const updateFormsList = (formId, formMetadata) => {
  try {
    // Obtener la lista actual de formularios
    const formsListJSON = localStorage.getItem(FORMS_LIST_KEY);
    let formsList = formsListJSON ? JSON.parse(formsListJSON) : [];
    
    // Verificar si el formulario ya existe en la lista
    const existingIndex = formsList.findIndex(form => form.id === formId);
    
    // Extraer solo los metadatos relevantes para la lista
    const metadataForList = {
      id: formId,
      lastUpdated: formMetadata.lastUpdated,
      status: formMetadata.status,
      // Extraer información básica que pueda ser útil en la lista
      fecha: formMetadata.data.headerData?.fechaVisita || 'Sin fecha',
      lugar: formMetadata.data.headerData?.espacioAtencion || 'Sin ubicación',
      numeroVisita: formMetadata.data.headerData?.numeroVisita || 'N/A'
    };
    
    // Actualizar o añadir el formulario a la lista
    if (existingIndex >= 0) {
      formsList[existingIndex] = metadataForList;
    } else {
      formsList.push(metadataForList);
    }
    
    // Guardar la lista actualizada
    localStorage.setItem(FORMS_LIST_KEY, JSON.stringify(formsList));
  } catch (error) {
    console.error('Error al actualizar la lista de formularios:', error);
  }
};

/**
 * Recupera un formulario del almacenamiento local
 * @param {string} formId - ID del formulario a recuperar
 * @returns {Object|null} - Datos del formulario o null si no existe
 */
export const getFormFromLocalStorage = (formId) => {
  try {
    const formJSON = localStorage.getItem(`${STORAGE_KEY}_${formId}`);
    if (!formJSON) return null;
    
    return JSON.parse(formJSON);
  } catch (error) {
    console.error('Error al recuperar del localStorage:', error);
    return null;
  }
};

/**
 * Obtiene la lista de todos los formularios guardados
 * @returns {Array} - Lista de metadatos de formularios
 */
export const getAllSavedForms = () => {
  try {
    const formsListJSON = localStorage.getItem(FORMS_LIST_KEY);
    return formsListJSON ? JSON.parse(formsListJSON) : [];
  } catch (error) {
    console.error('Error al obtener la lista de formularios:', error);
    return [];
  }
};

/**
 * Marca un formulario como completado
 * @param {string} formId - ID del formulario
 */
export const markFormAsComplete = (formId) => {
  try {
    const form = getFormFromLocalStorage(formId);
    if (form) {
      form.status = 'complete';
      form.completedAt = new Date().toISOString();
      localStorage.setItem(`${STORAGE_KEY}_${formId}`, JSON.stringify(form));
      updateFormsList(formId, form);
    }
  } catch (error) {
    console.error('Error al marcar formulario como completado:', error);
  }
};

/**
 * Elimina un formulario del almacenamiento local
 * @param {string} formId - ID del formulario a eliminar
 */
export const deleteForm = (formId) => {
  try {
    // Eliminar el formulario
    localStorage.removeItem(`${STORAGE_KEY}_${formId}`);
    
    // Actualizar la lista de formularios
    const formsListJSON = localStorage.getItem(FORMS_LIST_KEY);
    if (formsListJSON) {
      let formsList = JSON.parse(formsListJSON);
      formsList = formsList.filter(form => form.id !== formId);
      localStorage.setItem(FORMS_LIST_KEY, JSON.stringify(formsList));
    }
  } catch (error) {
    console.error('Error al eliminar formulario:', error);
  }
};

/**
 * Comprueba el espacio disponible en localStorage
 * @returns {Object} - Información sobre el espacio utilizado
 */
export const checkStorageSpace = () => {
  try {
    const totalSize = JSON.stringify(localStorage).length;
    const usedPercentage = (totalSize / 5000000) * 100; // Aproximadamente 5MB es el límite típico
    
    return {
      totalSize,
      usedPercentage,
      isFull: usedPercentage > 90
    };
  } catch (error) {
    console.error('Error al verificar espacio de almacenamiento:', error);
    return { error: true };
  }
};

/**
 * Limpia formularios antiguos si el almacenamiento está casi lleno
 * @param {number} olderThanDays - Eliminar formularios más antiguos que estos días
 */
export const cleanupOldForms = (olderThanDays = 30) => {
  try {
    const storageStatus = checkStorageSpace();
    
    // Solo limpiar si estamos por encima del 80% de capacidad
    if (storageStatus.usedPercentage > 80) {
      const forms = getAllSavedForms();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      forms.forEach(form => {
        const lastUpdated = new Date(form.lastUpdated);
        if (lastUpdated < cutoffDate && form.status === 'synced') {
          deleteForm(form.id);
        }
      });
    }
  } catch (error) {
    console.error('Error al limpiar formularios antiguos:', error);
  }
};