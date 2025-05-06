import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    Timestamp 
  } from 'firebase/firestore';
  import { db } from '../firebase/config';
  
  // Función mejorada para obtener datos de formularios con filtros
  export const getFormulariosDashboard = async (filtros = {}) => {
    try {
      console.log("Filtros aplicados:", filtros); // Para depuración
      
      // Obtener todos los documentos primero (es más eficiente para colecciones pequeñas)
      // Añadir un filtro base para excluir autoguardados
      const baseQuery = query(
        collection(db, 'formSummaries'),
        where("isAutoSave", "!=", true) // Excluir autoguardados
      );
      
      const querySnapshot = await getDocs(baseQuery);
      
      // Procesamos filtros manualmente para mayor control y flexibilidad
      let formularios = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let incluir = true;
        
        // Filtro por fecha inicio
        if (filtros.fechaInicio && data.fechaVisita) {
          if (data.fechaVisita < filtros.fechaInicio) {
            incluir = false;
          }
        }
        
        // Filtro por fecha fin
        if (filtros.fechaFin && data.fechaVisita) {
          if (data.fechaVisita > filtros.fechaFin) {
            incluir = false;
          }
        }
        
        // Filtro por tipo de espacio
        if (filtros.tipoEspacio && filtros.tipoEspacio !== 'todos' && data.tipoEspacio) {
          if (data.tipoEspacio !== filtros.tipoEspacio) {
            incluir = false;
          }
        }
        
        // Filtro por contratista
        if (filtros.contratista && filtros.contratista !== 'todos' && data.contratista) {
          if (data.contratista !== filtros.contratista) {
            incluir = false;
          }
        }
        
        // Si pasa todos los filtros, incluir en resultados
        if (incluir) {
          // Convertir timestamp a fecha si existe
          let createdAt = data.createdAt;
          if (createdAt && typeof createdAt.toDate === 'function') {
            createdAt = createdAt.toDate();
          }
          
          formularios.push({
            id: doc.id,
            ...data,
            createdAt: createdAt instanceof Date ? createdAt.toLocaleString() : createdAt
          });
        }
      });
      
      // Ordenar por fecha de visita (descendente)
      formularios.sort((a, b) => {
        if (!a.fechaVisita) return 1;
        if (!b.fechaVisita) return -1;
        return new Date(b.fechaVisita) - new Date(a.fechaVisita);
      });
      
      console.log(`Encontrados ${formularios.length} formularios después de filtrar`);
      
      return formularios;
    } catch (error) {
      console.error('Error al obtener datos para el dashboard:', error);
      throw error;
    }
  };
  
  // Función para obtener contratistas únicos
  export const getContratistasUnicos = async () => {
    try {
      // Filtrar para excluir autoguardados
      const q = query(
        collection(db, 'formSummaries'), 
        where("isAutoSave", "!=", true)
      );
      
      const querySnapshot = await getDocs(q);
      
      const contratistas = new Set();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.contratista) {
          contratistas.add(data.contratista);
        }
      });
      
      return Array.from(contratistas).sort();
    } catch (error) {
      console.error('Error al obtener contratistas únicos:', error);
      throw error;
    }
  };
  
  // Función para obtener espacios de atención únicos
  export const getEspaciosUnicos = async () => {
    try {
      // Filtrar para excluir autoguardados
      const q = query(
        collection(db, 'formSummaries'),
        where("isAutoSave", "!=", true)
      );
      
      const querySnapshot = await getDocs(q);
      
      const espacios = new Set();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.espacioAtencion) {
          espacios.add(data.espacioAtencion);
        }
      });
      
      return Array.from(espacios).sort();
    } catch (error) {
      console.error('Error al obtener espacios únicos:', error);
      throw error;
    }
  };
  
  // Función mejorada para calcular métricas agregadas
  export const calcularMetricasDashboard = (formularios) => {
    // Si no hay datos, devolver estructura básica con valores en cero
    if (!formularios || formularios.length === 0) {
      return {
        promedioCumplimiento: 0,
        totalVisitas: 0,
        promedioPmAsistentes: 0,
        totalPmAsistentes: 0,
        porContratista: [],
        porTipoEspacio: [],
        porFecha: [],
        porComponente: {
          tecnico: 0,
          nutricion: 0,
          infraestructura: 0
        },
        porComponenteDetallado: {
          tecnico: { puntosTotales: 0, puntosMaximos: 0, items: [] },
          nutricion: { puntosTotales: 0, puntosMaximos: 0, items: [] },
          infraestructura: { puntosTotales: 0, puntosMaximos: 0, items: [] }
        }
      };
    }
    
    // Inicializar variables para cálculos
    let sumaCumplimiento = 0;
    let sumaPmAsistentes = 0; // Nueva variable para sumar personas mayores asistentes
    const contratoMap = new Map();
    const tipoEspacioMap = new Map();
    const fechaMap = new Map();
    
    // Estadísticas por componente
    let sumaCompTecnico = 0;
    let contadorCompTecnico = 0;
    let sumaCompNutricion = 0;
    let contadorCompNutricion = 0;
    let sumaCompInfra = 0;
    let contadorCompInfra = 0;
    
    // Por tipo de espacio y PM asistentes
    const pmPorTipoEspacio = {
      'cdvfijo': { total: 0, visitas: 0 },
      'cdvparque': { total: 0, visitas: 0 }
    };
    
    // Agregar seguimiento de puntos totales acumulados y posibles por componente
    const componenteStats = {
      'COMPONENTE TÉCNICO': { puntosTotales: 0, puntosMaximos: 0, items: [] },
      'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN': { puntosTotales: 0, puntosMaximos: 0, items: [] },
      'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN': { puntosTotales: 0, puntosMaximos: 0, items: [] }
    };
    
    // Procesar cada formulario
    formularios.forEach(form => {
      // Suma para promedio de cumplimiento
      if (form.porcentajeCumplimiento) {
        sumaCumplimiento += Number(form.porcentajeCumplimiento) || 0;
      }
      
      // Suma para promedio de PM asistentes
      const pmAsistentes = parseInt(form.pmAsistentes || 0, 10);
      if (!isNaN(pmAsistentes)) {
        sumaPmAsistentes += pmAsistentes;
        
        // Sumar PM asistentes por tipo de espacio
        if (form.tipoEspacio && pmPorTipoEspacio[form.tipoEspacio]) {
          pmPorTipoEspacio[form.tipoEspacio].total += pmAsistentes;
          pmPorTipoEspacio[form.tipoEspacio].visitas += 1;
        }
      }
      
      // Agrupar por contratista
      if (form.contratista) {
        const contratista = form.contratista;
        if (contratoMap.has(contratista)) {
          const actual = contratoMap.get(contratista);
          contratoMap.set(contratista, {
            count: actual.count + 1,
            sumaCumplimiento: actual.sumaCumplimiento + (Number(form.porcentajeCumplimiento) || 0),
            sumaPm: actual.sumaPm + pmAsistentes
          });
        } else {
          contratoMap.set(contratista, {
            count: 1,
            sumaCumplimiento: Number(form.porcentajeCumplimiento) || 0,
            sumaPm: pmAsistentes
          });
        }
      }
      
      // Agrupar por tipo de espacio con nombres correctos
      if (form.tipoEspacio) {
        const tipoEspacio = form.tipoEspacio === 'cdvfijo' ? 'Centro de Vida Fijo' : 
                            form.tipoEspacio === 'cdvparque' ? 'Centro de Vida Parque/Espacio Comunitario' : 
                            form.tipoEspacio;
                            
        if (tipoEspacioMap.has(tipoEspacio)) {
          const actual = tipoEspacioMap.get(tipoEspacio);
          tipoEspacioMap.set(tipoEspacio, {
            count: actual.count + 1,
            sumaCumplimiento: actual.sumaCumplimiento + (Number(form.porcentajeCumplimiento) || 0),
            sumaPm: actual.sumaPm + pmAsistentes
          });
        } else {
          tipoEspacioMap.set(tipoEspacio, {
            count: 1,
            sumaCumplimiento: Number(form.porcentajeCumplimiento) || 0,
            sumaPm: pmAsistentes
          });
        }
      }
      
      // Agrupar por fecha
      if (form.fechaVisita) {
        if (fechaMap.has(form.fechaVisita)) {
          const actual = fechaMap.get(form.fechaVisita);
          fechaMap.set(form.fechaVisita, {
            count: actual.count + 1,
            sumaCumplimiento: actual.sumaCumplimiento + (Number(form.porcentajeCumplimiento) || 0),
            sumaPm: actual.sumaPm + pmAsistentes
          });
        } else {
          fechaMap.set(form.fechaVisita, {
            count: 1,
            sumaCumplimiento: Number(form.porcentajeCumplimiento) || 0,
            sumaPm: pmAsistentes
          });
        }
      }
      
      // Calcular promedios por componente con más detalles - IMPORTANTE: Verificar estructura correcta
      if (form.puntajePorComponente) {
        // Componente técnico
        if (form.puntajePorComponente['COMPONENTE TÉCNICO']) {
          const comp = form.puntajePorComponente['COMPONENTE TÉCNICO'];
          // Asegurarnos de convertir a número y manejar valores nulos o indefinidos
          if (comp.porcentaje !== undefined && comp.porcentaje !== null) {
            sumaCompTecnico += Number(comp.porcentaje) || 0;
            contadorCompTecnico++;
          }
          
          if (comp.total !== undefined && comp.maxPuntos !== undefined) {
            componenteStats['COMPONENTE TÉCNICO'].puntosTotales += Number(comp.total) || 0;
            componenteStats['COMPONENTE TÉCNICO'].puntosMaximos += Number(comp.maxPuntos) || 0;
          }
        }
        
        // Componente nutrición
        if (form.puntajePorComponente['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN']) {
          const comp = form.puntajePorComponente['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'];
          if (comp.porcentaje !== undefined && comp.porcentaje !== null) {
            sumaCompNutricion += Number(comp.porcentaje) || 0;
            contadorCompNutricion++;
          }
          
          if (comp.total !== undefined && comp.maxPuntos !== undefined) {
            componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].puntosTotales += Number(comp.total) || 0;
            componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].puntosMaximos += Number(comp.maxPuntos) || 0;
          }
        }
        
        // Componente infraestructura
        if (form.puntajePorComponente['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN']) {
          const comp = form.puntajePorComponente['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'];
          if (comp.porcentaje !== undefined && comp.porcentaje !== null) {
            sumaCompInfra += Number(comp.porcentaje) || 0;
            contadorCompInfra++;
          }
          
          if (comp.total !== undefined && comp.maxPuntos !== undefined) {
            componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].puntosTotales += Number(comp.total) || 0;
            componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].puntosMaximos += Number(comp.maxPuntos) || 0;
          }
        }
      }
      
      // Procesar detalles por ítem si existen
      if (form.detalleItems) {
        Object.entries(form.detalleItems).forEach(([nombreComponente, items]) => {
          if (componenteStats[nombreComponente]) {
            Object.entries(items).forEach(([itemId, itemData]) => {
              if (itemData && itemData.valor !== undefined) {
                componenteStats[nombreComponente].items.push({
                  id: itemId,
                  label: itemData.label || `Ítem ${itemId}`,
                  valor: Number(itemData.valor) || 0,
                  valorMaximo: Number(itemData.valorMaximo) || 100,
                  formularioId: form.id || form.formId
                });
              }
            });
          }
        });
      }
    });
    
    // Calcular promedios
    const promedioCumplimiento = formularios.length > 0 ? Math.round(sumaCumplimiento / formularios.length) : 0;
    const promedioPmAsistentes = formularios.length > 0 ? Math.round(sumaPmAsistentes / formularios.length) : 0;
    
    // Promedios por tipo de espacio
    const promedioPmFijo = pmPorTipoEspacio['cdvfijo'].visitas > 0 ? 
                           Math.round(pmPorTipoEspacio['cdvfijo'].total / pmPorTipoEspacio['cdvfijo'].visitas) : 0;
    
    const promedioPmParque = pmPorTipoEspacio['cdvparque'].visitas > 0 ? 
                            Math.round(pmPorTipoEspacio['cdvparque'].total / pmPorTipoEspacio['cdvparque'].visitas) : 0;
    
    // Convertir mapas a arrays para gráficos
    const porContratista = Array.from(contratoMap.entries()).map(([contratista, datos]) => ({
      name: contratista,
      visitas: datos.count,
      promedio: Math.round(datos.sumaCumplimiento / datos.count),
      pmAsistentes: Math.round(datos.sumaPm / datos.count)
    })).sort((a, b) => b.promedio - a.promedio);
    
    const porTipoEspacio = Array.from(tipoEspacioMap.entries()).map(([tipo, datos]) => ({
      name: tipo,
      visitas: datos.count,
      promedio: Math.round(datos.sumaCumplimiento / datos.count),
      pmAsistentes: Math.round(datos.sumaPm / datos.count)
    }));
    
    // Ordenar fechas cronológicamente
    const porFecha = Array.from(fechaMap.entries())
      .map(([fecha, datos]) => ({
        fecha,
        visitas: datos.count,
        promedio: Math.round(datos.sumaCumplimiento / datos.count),
        pmAsistentes: Math.round(datos.sumaPm / datos.count)
      }))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    // Promedios por componente
    const promedioComponentes = {
      tecnico: contadorCompTecnico > 0 ? Math.round(sumaCompTecnico / contadorCompTecnico) : 0,
      nutricion: contadorCompNutricion > 0 ? Math.round(sumaCompNutricion / contadorCompNutricion) : 0,
      infraestructura: contadorCompInfra > 0 ? Math.round(sumaCompInfra / contadorCompInfra) : 0
    };
    
    // Calcular porcentajes totales para cada componente
    const porcentajeTecnico = componenteStats['COMPONENTE TÉCNICO'].puntosMaximos > 0 ? 
      Math.round((componenteStats['COMPONENTE TÉCNICO'].puntosTotales / 
        componenteStats['COMPONENTE TÉCNICO'].puntosMaximos) * 100) : 0;
        
    const porcentajeNutricion = componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].puntosMaximos > 0 ? 
      Math.round((componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].puntosTotales / 
        componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].puntosMaximos) * 100) : 0;
        
    const porcentajeInfraestructura = componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].puntosMaximos > 0 ? 
      Math.round((componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].puntosTotales / 
        componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].puntosMaximos) * 100) : 0;
    
    return {
      promedioCumplimiento,
      totalVisitas: formularios.length,
      promedioPmAsistentes,
      totalPmAsistentes: sumaPmAsistentes,
      pmPorTipoEspacio: {
        fijo: promedioPmFijo,
        parque: promedioPmParque
      },
      porContratista,
      porTipoEspacio,
      porFecha,
      porComponente: promedioComponentes,
      porComponenteDetallado: {
        tecnico: {
          promedio: promedioComponentes.tecnico,
          puntosTotales: componenteStats['COMPONENTE TÉCNICO'].puntosTotales,
          puntosMaximos: componenteStats['COMPONENTE TÉCNICO'].puntosMaximos,
          porcentaje: porcentajeTecnico,
          items: componenteStats['COMPONENTE TÉCNICO'].items
        },
        nutricion: {
          promedio: promedioComponentes.nutricion,
          puntosTotales: componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].puntosTotales,
          puntosMaximos: componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].puntosMaximos,
          porcentaje: porcentajeNutricion,
          items: componenteStats['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN'].items
        },
        infraestructura: {
          promedio: promedioComponentes.infraestructura,
          puntosTotales: componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].puntosTotales,
          puntosMaximos: componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].puntosMaximos,
          porcentaje: porcentajeInfraestructura,
          items: componenteStats['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'].items
        }
      }
    };
  };
  
  export default {
    getFormulariosDashboard,
    getContratistasUnicos,
    getEspaciosUnicos,
    calcularMetricasDashboard
  };