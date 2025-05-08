import supabase from '../supabase/config';

/**
 * Servicio para interactuar con Supabase
 */

// ----- CONTRATISTAS -----

/**
 * Obtener todos los contratistas
 */
export const getContractors = async () => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('nombre');
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener contratistas:', error);
    return [];
  }
};

/**
 * Obtener un contratista por su ID
 */
export const getContractorById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener contratista:', error);
    return null;
  }
};

// ----- ESPACIOS DE ATENCIÓN -----

/**
 * Obtener espacios de atención por contratista
 */
export const getEspaciosByContratista = async (contractorId) => {
  try {
    const { data, error } = await supabase
      .from('espacios_atencion')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('nombre');
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener espacios de atención:', error);
    return [];
  }
};

// ----- VISITAS -----

/**
 * Guardar una visita nueva completa
 */
export const saveVisit = async (visitData) => {
  try {
    // 1. Primero crear el registro principal de la visita
    const { headerData, checklistSectionsData, generalObservations, photos, signatures, geoLocation } = visitData;
    
    // Buscar IDs de contratista y espacio (si existe)
    let contractorId = null;
    
    // Si tenemos entidadContratista, buscar su ID
    if (headerData.entidadContratista) {
      const { data: contractorData } = await supabase
        .from('contractors')
        .select('id')
        .eq('nombre', headerData.entidadContratista)
        .single();
        
      if (contractorData) {
        contractorId = contractorData.id;
      }
    }
    
    // Crear visita
    const { data: visitRecord, error: visitError } = await supabase
      .from('visitas')
      .insert([
        {
          fecha_visita: headerData.fechaVisita,
          hora_visita: headerData.horaVisita,
          contractor_id: contractorId,
          espacio_atencion_nombre: headerData.espacioAtencion || null,
          apoyo_supervision: headerData.apoyoSupervision || null,
          personas_mayores_asistentes: headerData.pmAsistentes || 0,
          nombre_profesional: headerData.nombreProfesional || null,
          nombre_supervisor: headerData.nombreSupervisor || null,
          observaciones: generalObservations || null,
          latitude: geoLocation?.latitude || null,
          longitude: geoLocation?.longitude || null,
          accuracy: geoLocation?.accuracy || null,
          direccion: geoLocation?.address || null
        }
      ])
      .select()
      .single();
      
    if (visitError) throw visitError;
    
    const visitId = visitRecord.id;
    
    // 2. Guardar datos del checklist
    if (checklistSectionsData && Object.keys(checklistSectionsData).length > 0) {
      const checklistItems = [];
      
      // Transformar secciones del checklist en formato de tabla
      Object.entries(checklistSectionsData).forEach(([seccion, items]) => {
        Object.entries(items).forEach(([itemId, itemData]) => {
          checklistItems.push({
            visita_id: visitId,
            seccion,
            item_id: itemId,
            valor: parseInt(itemData.value || 0),
            texto: itemData.displayText || null,
            observacion: itemData.observation || null
          });
        });
      });
      
      if (checklistItems.length > 0) {
        const { error: checklistError } = await supabase
          .from('checklist_data')
          .insert(checklistItems);
          
        if (checklistError) {
          console.error('Error al guardar checklist:', checklistError);
        }
      }
    }
    
    // 3. Guardar fotos si existen
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        // Convertir data URL a Blob
        const blob = await fetch(photo.preview).then(r => r.blob());
        
        // Crear nombre de archivo único
        const filename = `visitas/${visitId}/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;
        
        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('supervision')
          .upload(filename, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });
          
        if (uploadError) {
          console.error('Error al subir foto:', uploadError);
          continue;
        }
        
        // Registrar en la tabla de fotos
        const { error: photoError } = await supabase
          .from('fotos')
          .insert([{
            visita_id: visitId,
            storage_path: filename,
            descripcion: photo.description || null,
            timestamp: photo.timestamp || new Date().toISOString()
          }]);
          
        if (photoError) {
          console.error('Error al registrar foto en BD:', photoError);
        }
      }
    }
    
    // 4. Guardar firmas si existen
    if (signatures && Object.keys(signatures).length > 0) {
      for (const [rol, signatureData] of Object.entries(signatures)) {
        if (signatureData.data) {
          // Convertir data URL a Blob
          const blob = await fetch(signatureData.data).then(r => r.blob());
          
          // Crear nombre de archivo único
          const filename = `visitas/${visitId}/firma_${rol.replace(/\s+/g, '_')}.png`;
          
          // Subir a Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('supervision')
            .upload(filename, blob, {
              contentType: 'image/png',
              upsert: true
            });
            
          if (uploadError) {
            console.error('Error al subir firma:', uploadError);
            continue;
          }
          
          // Registrar en la tabla de firmas
          const { error: signatureError } = await supabase
            .from('firmas')
            .insert([{
              visita_id: visitId,
              rol: rol.toLowerCase(),
              storage_path: filename,
              firmado: signatureData.checked || false
            }]);
            
          if (signatureError) {
            console.error('Error al registrar firma en BD:', signatureError);
          }
        }
      }
    }
    
    return {
      success: true,
      id: visitId,
      message: 'Visita guardada correctamente'
    };
  } catch (error) {
    console.error('Error al guardar visita:', error);
    return {
      success: false,
      error: error.message,
      message: 'Error al guardar la visita'
    };
  }
};

/**
 * Obtener visitas realizadas
 */
export const getVisitas = async (limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('visitas')
      .select(`
        *,
        contractors(nombre)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener visitas:', error);
    return [];
  }
};

/**
 * Obtener detalles de una visita específica
 */
export const getVisitaDetalle = async (visitaId) => {
  try {
    // Obtener datos principales de la visita
    const { data: visita, error: visitaError } = await supabase
      .from('visitas')
      .select(`
        *,
        contractors(*)
      `)
      .eq('id', visitaId)
      .single();
      
    if (visitaError) throw visitaError;
    
    // Obtener checklist
    const { data: checklistData, error: checklistError } = await supabase
      .from('checklist_data')
      .select('*')
      .eq('visita_id', visitaId);
      
    if (checklistError) throw checklistError;
    
    // Obtener fotos
    const { data: fotosData, error: fotosError } = await supabase
      .from('fotos')
      .select('*')
      .eq('visita_id', visitaId);
      
    if (fotosError) throw fotosError;
    
    // Obtener URLs públicas para las fotos
    const fotosConUrl = await Promise.all(fotosData.map(async (foto) => {
      const { data: publicUrl } = supabase.storage
        .from('supervision')
        .getPublicUrl(foto.storage_path);
        
      return {
        ...foto,
        url: publicUrl.publicUrl
      };
    }));
    
    // Obtener firmas
    const { data: firmasData, error: firmasError } = await supabase
      .from('firmas')
      .select('*')
      .eq('visita_id', visitaId);
      
    if (firmasError) throw firmasError;
    
    // Obtener URLs públicas para las firmas
    const firmasConUrl = await Promise.all(firmasData.map(async (firma) => {
      const { data: publicUrl } = supabase.storage
        .from('supervision')
        .getPublicUrl(firma.storage_path);
        
      return {
        ...firma,
        url: publicUrl.publicUrl
      };
    }));
    
    // Formatear datos del checklist por secciones
    const checklistPorSeccion = {};
    if (checklistData) {
      checklistData.forEach(item => {
        if (!checklistPorSeccion[item.seccion]) {
          checklistPorSeccion[item.seccion] = {};
        }
        
        checklistPorSeccion[item.seccion][item.item_id] = {
          value: item.valor,
          displayText: item.texto,
          observation: item.observacion
        };
      });
    }
    
    return {
      visita,
      checklist: checklistPorSeccion,
      fotos: fotosConUrl,
      firmas: firmasConUrl
    };
  } catch (error) {
    console.error('Error al obtener detalles de visita:', error);
    return null;
  }
};

// ----- ESTADÍSTICAS PARA DASHBOARD -----

/**
 * Obtener estadísticas para dashboard
 */
export const getEstadisticas = async () => {
  try {
    // Obtener datos de la vista de estadísticas
    const { data, error } = await supabase
      .from('estadisticas_visitas')
      .select('*');
      
    if (error) throw error;
    
    // Procesar datos para gráficos
    const visitasPorContratista = {};
    const visitasPorEspacio = {};
    const visitasPorMes = {};
    
    data.forEach(item => {
      // Agrupar por contratista
      if (!visitasPorContratista[item.contratista]) {
        visitasPorContratista[item.contratista] = 0;
      }
      visitasPorContratista[item.contratista] += parseInt(item.total_visitas);
      
      // Agrupar por espacio
      if (!visitasPorEspacio[item.espacio_atencion_nombre]) {
        visitasPorEspacio[item.espacio_atencion_nombre] = {
          total: 0,
          contratista: item.contratista
        };
      }
      visitasPorEspacio[item.espacio_atencion_nombre].total += parseInt(item.total_visitas);
      
      // Agrupar por mes
      const mesLabel = formatearMes(item.mes);
      if (!visitasPorMes[mesLabel]) {
        visitasPorMes[mesLabel] = {};
      }
      if (!visitasPorMes[mesLabel][item.contratista]) {
        visitasPorMes[mesLabel][item.contratista] = 0;
      }
      visitasPorMes[mesLabel][item.contratista] += parseInt(item.total_visitas);
    });
    
    // Convertir a arrays para gráficos
    const contratosPieData = Object.entries(visitasPorContratista).map(([name, value]) => ({
      name,
      value
    }));
    
    const espaciosBarData = Object.entries(visitasPorEspacio)
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        value: data.total,
        contratista: data.contratista
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10
    
    const mesesLineData = Object.entries(visitasPorMes)
      .map(([month, data]) => ({
        month,
        ...data
      }))
      .sort((a, b) => {
        // Ordenar cronológicamente
        const monthA = a.month.split(' ')[0];
        const yearA = a.month.split(' ')[1];
        const monthB = b.month.split(' ')[0];
        const yearB = b.month.split(' ')[1];
        
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return monthToNumber(monthA) - monthToNumber(monthB);
      });
    
    return {
      contratosPieData,
      espaciosBarData,
      mesesLineData,
      totalVisitas: Object.values(visitasPorContratista).reduce((a, b) => a + b, 0),
      totalEspacios: Object.keys(visitasPorEspacio).length,
      totalContratistas: Object.keys(visitasPorContratista).length
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return null;
  }
};

// ----- FUNCIONES AUXILIARES -----

/**
 * Formatear mes para presentación
 */
const formatearMes = (fechaISO) => {
  if (!fechaISO) return 'Desconocido';
  
  try {
    const fecha = new Date(fechaISO);
    return `${fecha.toLocaleDateString('es-ES', { month: 'short' })} ${fecha.getFullYear()}`;
  } catch (error) {
    return 'Desconocido';
  }
};

/**
 * Convertir nombre de mes a número
 */
const monthToNumber = (month) => {
  const months = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };
  return months[month.toLowerCase().substring(0, 3)] || 0;
};