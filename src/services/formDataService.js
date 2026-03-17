import { 
    collection, 
    addDoc,
    doc,
    getDoc,
    getDocs, 
    query, 
    setDoc,
    where, 
    orderBy, 
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from '../firebase/config';
  import { getCurrentUser } from './authService';

  const deriveVigencia = (fechaVisita) => {
    const yearFromString = typeof fechaVisita === 'string'
      ? Number(fechaVisita.slice(0, 4))
      : NaN;

    if (!Number.isNaN(yearFromString) && yearFromString > 1900) {
      return yearFromString;
    }

    const parsedDate = fechaVisita ? new Date(fechaVisita) : null;
    if (parsedDate instanceof Date && !Number.isNaN(parsedDate?.getTime?.())) {
      return parsedDate.getFullYear();
    }

    return new Date().getFullYear();
  };

  const buildRemoteFormSummaryId = (userId, localFormId) => {
    if (!userId || localFormId === null || localFormId === undefined || localFormId === '') {
      throw new Error('No se pudo generar el ID remoto del formulario');
    }

    const normalizedUserId = String(userId).replace(/\//g, '_');
    const normalizedLocalFormId = String(localFormId).replace(/\//g, '_');

    return `${normalizedUserId}_${normalizedLocalFormId}`;
  };
  
  // Guardar resumen del formulario en Firestore
  export const saveFormSummary = async (formData) => {
    try {
      // Verificar si es un autoguardado y si queremos ignorarlo
      if (formData.isAutoSave === true) {
        console.log('Ignorando autoguardado en Firebase');
        return null;
      }
      
      const currentUser = getCurrentUser();
      const effectiveUserId = formData.userId || formData.userid || currentUser?.uid || 'anonymous';
      const effectiveUserEmail = formData.userEmail || currentUser?.email || 'anonymous';
      const localFormId = formData.localFormId ?? formData.formId ?? null;
      const observacionesGenerales = formData.observacionesGenerales || formData.generalObservations || '';
      const hasObservaciones = observacionesGenerales.trim().length > 0;
      const vigencia = deriveVigencia(formData.headerData?.fechaVisita);
      const remoteFormId = localFormId ? buildRemoteFormSummaryId(effectiveUserId, localFormId) : null;
      const docRef = remoteFormId ? doc(db, 'formSummaries', remoteFormId) : null;
      const existingDoc = docRef ? await getDoc(docRef) : null;

      // Extraer y organizar datos de componentes
      const componenteTecnico = {};
      const componenteNutricion = {};
      const componenteInfraestructura = {};
      const itemsTecnicos = {};
      const itemsNutricion = {};
      const itemsInfraestructura = {};
      
      // Procesar datos de checklist si están disponibles
      if (formData.checklistSectionsData) {
        // Revisar cada sección del checklist
        Object.entries(formData.checklistSectionsData).forEach(([sectionTitle, sectionData]) => {
          // Utilizamos includes() para ser más flexibles con los nombres de componentes
          if (sectionTitle.toLowerCase().includes('técnico') && sectionData.puntuacion) {
            componenteTecnico.total = sectionData.puntuacion.total || 0;
            componenteTecnico.promedio = sectionData.puntuacion.promedio || 0;
            componenteTecnico.porcentaje = sectionData.puntuacion.porcentaje || 0;
            componenteTecnico.maxPuntos = sectionData.puntuacion.maxPuntos || 0;
            componenteTecnico.respondidos = sectionData.puntuacion.respondidos || 0;
            
            // Extraer detalles por ítem
            Object.entries(sectionData).forEach(([itemKey, itemData]) => {
              // Solo procesar si no es la puntuación global y tiene un valor definido
              if (itemKey !== 'puntuacion' && itemData && itemData.value !== undefined) {
                itemsTecnicos[itemKey] = {
                  valor: itemData.value !== 'N/A' ? Number(itemData.value) : 0,
                  valorMaximo: 100, // Valor máximo por ítem
                  displayText: itemData.displayText || '',
                  label: itemData.label || ''
                };
              }
            });
          } 
          else if (sectionTitle.toLowerCase().includes('nutrición') && sectionData.puntuacion) {
            componenteNutricion.total = sectionData.puntuacion.total || 0;
            componenteNutricion.promedio = sectionData.puntuacion.promedio || 0;
            componenteNutricion.porcentaje = sectionData.puntuacion.porcentaje || 0;
            componenteNutricion.maxPuntos = sectionData.puntuacion.maxPuntos || 0;
            componenteNutricion.respondidos = sectionData.puntuacion.respondidos || 0;
            
            // Extraer detalles por ítem
            Object.entries(sectionData).forEach(([itemKey, itemData]) => {
              if (itemKey !== 'puntuacion' && itemData && itemData.value !== undefined) {
                itemsNutricion[itemKey] = {
                  valor: itemData.value !== 'N/A' ? Number(itemData.value) : 0,
                  valorMaximo: 100,
                  displayText: itemData.displayText || '',
                  label: itemData.label || ''
                };
              }
            });
          } 
          else if (sectionTitle.toLowerCase().includes('infraestructura') && sectionData.puntuacion) {
            componenteInfraestructura.total = sectionData.puntuacion.total || 0;
            componenteInfraestructura.promedio = sectionData.puntuacion.promedio || 0;
            componenteInfraestructura.porcentaje = sectionData.puntuacion.porcentaje || 0;
            componenteInfraestructura.maxPuntos = sectionData.puntuacion.maxPuntos || 0;
            componenteInfraestructura.respondidos = sectionData.puntuacion.respondidos || 0;
            
            // Extraer detalles por ítem
            Object.entries(sectionData).forEach(([itemKey, itemData]) => {
              if (itemKey !== 'puntuacion' && itemData && itemData.value !== undefined) {
                itemsInfraestructura[itemKey] = {
                  valor: itemData.value !== 'N/A' ? Number(itemData.value) : 0,
                  valorMaximo: 100,
                  displayText: itemData.displayText || '',
                  label: itemData.label || ''
                };
              }
            });
          }
        });
      }
      
      // Asegurar que tenemos la puntuación total
      const puntajeTotal = formData.puntuacionTotal?.total || 0;
      const porcentajeCumplimiento = formData.puntuacionTotal?.porcentajeCumplimiento || 0;
      
      // Extraer solo los datos clave que necesitamos almacenar
      const formSummary = {
        // Datos de puntuación
        puntajeTotal: puntajeTotal,
        porcentajeCumplimiento: porcentajeCumplimiento,
        
        // Puntuación por componente (secciones)
        puntajePorComponente: {
          'COMPONENTE TÉCNICO': {
            total: componenteTecnico.total || 0,
            promedio: componenteTecnico.promedio || 0,
            porcentaje: componenteTecnico.porcentaje || 0,
            maxPuntos: componenteTecnico.maxPuntos || 0,
            respondidos: componenteTecnico.respondidos || 0
          },
          'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN': {
            total: componenteNutricion.total || 0,
            promedio: componenteNutricion.promedio || 0,
            porcentaje: componenteNutricion.porcentaje || 0,
            maxPuntos: componenteNutricion.maxPuntos || 0,
            respondidos: componenteNutricion.respondidos || 0
          },
          'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN': {
            total: componenteInfraestructura.total || 0,
            promedio: componenteInfraestructura.promedio || 0,
            porcentaje: componenteInfraestructura.porcentaje || 0,
            maxPuntos: componenteInfraestructura.maxPuntos || 0,
            respondidos: componenteInfraestructura.respondidos || 0
          }
        },
        
        // Incluir detalles de ítems para análisis profundo
        detalleItems: {
          'COMPONENTE TÉCNICO': itemsTecnicos,
          'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN': itemsNutricion,
          'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN': itemsInfraestructura
        },
        
        // Datos de la visita
        fechaVisita: formData.headerData?.fechaVisita || '',
        horaVisita: formData.headerData?.horaVisita || '',
        contratista: formData.headerData?.entidadContratista || '',
        apoyoSupervision: formData.headerData?.apoyoSupervision || '',
        espacioAtencion: formData.headerData?.espacioAtencion || '',
        tipoEspacio: formData.tipoEspacio || '',
        pmAsistentes: parseInt(formData.headerData?.pmAsistentes || 0, 10),
        observacionesGenerales,
        vigencia,
        hasObservaciones,
        
        // Metadatos
        userId: effectiveUserId,
        userEmail: effectiveUserEmail,
        localFormId: localFormId,
        remoteFormId: remoteFormId,
        isComplete: formData.isComplete || false,
        isAutoSave: formData.isAutoSave || false,
        updatedAt: serverTimestamp()
      };

      // Mantenemos el guardado remoto idempotente cuando existe un ID local estable.
      if (docRef) {
        // Conservamos createdAt para no alterar consultas existentes del dashboard.
        if (!existingDoc.exists()) {
          formSummary.createdAt = serverTimestamp();
        }

        await setDoc(docRef, formSummary, { merge: true });
        return remoteFormId;
      }

      // Fallback legado: si no hay ID local, seguimos permitiendo guardar sin romper el flujo.
      formSummary.createdAt = serverTimestamp();
      const fallbackDocRef = await addDoc(collection(db, 'formSummaries'), formSummary);
      return fallbackDocRef.id;
    } catch (error) {
      console.error('Error al guardar resumen del formulario:', error);
      throw error;
    }
  };
  
  // Función auxiliar para extraer puntuaciones por componente
  const extractComponentScores = (checklistData) => {
    if (!checklistData) return {};
    
    const scores = {};
    
    // Recorrer cada sección del checklist
    Object.entries(checklistData).forEach(([sectionTitle, sectionData]) => {
      if (sectionData.puntuacion) {
        scores[sectionTitle] = {
          total: sectionData.puntuacion.total || 0,
          promedio: sectionData.puntuacion.promedio || 0,
          porcentaje: sectionData.puntuacion.porcentaje || 0,
          maxPuntos: sectionData.puntuacion.maxPuntos || 0,
          respondidos: sectionData.puntuacion.respondidos || 0
        };
      }
    });
    
    return scores;
  };
  
  // Obtener todos los formularios guardados del usuario actual
  export const getUserFormSummaries = async () => {
    try {
      const userId = getCurrentUser()?.uid;
      
      if (!userId) {
        throw new Error("Usuario no autenticado");
      }
      
      // Consultar formularios del usuario actual y excluir autoguardados
      const q = query(
        collection(db, 'formSummaries'),
        where("userId", "==", userId),
        where("isAutoSave", "!=", true), // Ignorar autoguardados
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const forms = [];
      
      querySnapshot.forEach((doc) => {
        forms.push({
          id: doc.id,
          ...doc.data(),
          // Convertir el timestamp a fecha legible
          createdAt: doc.data().createdAt?.toDate().toLocaleString() || ''
        });
      });
      
      return forms;
    } catch (error) {
      console.error('Error al obtener formularios:', error);
      throw error;
    }
  };
  
  export default {
    saveFormSummary,
    getUserFormSummaries
  };
