import React, { useState, useMemo } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Chip,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import PlaceIcon from '@mui/icons-material/Place';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import WarningIcon from '@mui/icons-material/Warning';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const ItemsAlertaComponent = ({ datos }) => {
  // Hooks siempre al inicio del componente
  const [activeTab, setActiveTab] = useState(0);
  
  // Función para formatear fechas
  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'No disponible';
    
    try {
      // Formato YYYY-MM-DD a DD/MM/YYYY
      const partes = fechaString.split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
      return fechaString;
    } catch (e) {
      return fechaString;
    }
  };
  
  // Todos los useMemo al inicio, manejar condiciones internamente
  const espaciosPorModalidad = useMemo(() => {
    if (!datos || !datos.formularios || datos.formularios.length === 0) {
      return { cdvfijo: [], cdvparque: [] };
    }
    
    // Agrupar por espacio de atención
    const espaciosPorModalidad = {
      cdvfijo: {},
      cdvparque: {}
    };
    
    // Mapa para seguir la última fecha de visita para cada espacio
    const ultimasFechas = {};
    // Mapa para guardar los formularios por espacio (para calcular tendencias después)
    const formulariosPorEspacio = {};
    
    datos.formularios.forEach(form => {
      if (!form.espacioAtencion) return;
      
      const tipoEspacio = form.tipoEspacio || 'cdvfijo'; // Default a fijo si no está definido
      const espacioKey = form.espacioAtencion;
      
      // Inicializar el tracking de formularios por espacio si no existe
      if (!formulariosPorEspacio[espacioKey]) {
        formulariosPorEspacio[espacioKey] = [];
      }
      
      // Guardar el formulario para este espacio
      formulariosPorEspacio[espacioKey].push(form);
      
      // Actualizar la fecha más reciente
      if (!ultimasFechas[espacioKey] || form.fechaVisita > ultimasFechas[espacioKey]) {
        ultimasFechas[espacioKey] = form.fechaVisita;
      }
      
      if (!espaciosPorModalidad[tipoEspacio][espacioKey]) {
        espaciosPorModalidad[tipoEspacio][espacioKey] = {
          nombre: form.espacioAtencion,
          contratista: form.contratista || 'No especificado',
          sumaPromedio: 0,
          visitas: 0,
          ultimaFecha: null,
          formularios: []
        };
      }
      
      // Guardar todos los formularios relacionados con este espacio
      espaciosPorModalidad[tipoEspacio][espacioKey].formularios.push(form);
      
      // Acumular promedio y contar visitas
      espaciosPorModalidad[tipoEspacio][espacioKey].sumaPromedio += (form.porcentajeCumplimiento || 0);
      espaciosPorModalidad[tipoEspacio][espacioKey].visitas += 1;
    });
    
    // Calcular promedios, añadir fecha y calcular tendencia para cada espacio
    Object.keys(espaciosPorModalidad).forEach(tipo => {
      Object.keys(espaciosPorModalidad[tipo]).forEach(espacioKey => {
        const espacio = espaciosPorModalidad[tipo][espacioKey];
        
        // Calcular promedio
        espacio.promedio = Math.round(espacio.sumaPromedio / espacio.visitas);
        
        // Asignar fecha más reciente
        espacio.ultimaFecha = ultimasFechas[espacioKey];
        
        // Calcular tendencia (comparando con visita anterior)
        const formularios = formulariosPorEspacio[espacioKey];
        if (formularios && formularios.length > 1) {
          // Ordenar por fecha (más reciente primero)
          formularios.sort((a, b) => new Date(b.fechaVisita) - new Date(a.fechaVisita));
          
          // Obtener las dos visitas más recientes
          const ultimaVisita = formularios[0];
          const penultimaVisita = formularios[1];
          
          // Calcular diferencia de porcentaje
          if (ultimaVisita.porcentajeCumplimiento !== undefined && 
              penultimaVisita.porcentajeCumplimiento !== undefined) {
            const diferencia = ultimaVisita.porcentajeCumplimiento - penultimaVisita.porcentajeCumplimiento;
            espacio.tendencia = diferencia;
          }
        }
      });
    });
    
    // Calcular promedios y ordenar
    const top3Fijos = Object.values(espaciosPorModalidad.cdvfijo)
      .map(espacio => ({ ...espacio }))
      .sort((a, b) => a.promedio - b.promedio) // Ordenar ascendente (mostrar peores primero)
      .slice(0, 3); // Limitar a 3 espacios
    
    const top3Parques = Object.values(espaciosPorModalidad.cdvparque)
      .map(espacio => ({ ...espacio }))
      .sort((a, b) => a.promedio - b.promedio)
      .slice(0, 3);
    
    return {
      cdvfijo: top3Fijos,
      cdvparque: top3Parques
    };
  }, [datos]);
  
  // Hook para contratistas
  const contratistasProblematicos = useMemo(() => {
    if (!datos || !datos.porContratista || datos.porContratista.length === 0) {
      return [];
    }
    
    return [...datos.porContratista]
      .sort((a, b) => a.promedio - b.promedio)
      .slice(0, 3)
      .map(contratista => ({
        nombre: contratista.name,
        promedio: contratista.promedio
      }));
  }, [datos]);
  
  // Early return después de los hooks
  if (!datos || !datos.porComponenteDetallado) {
    return null;
  }
  
  // Función para manejar cambios de pestaña
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Función para encontrar los ítems con menor puntuación por componente y modalidad
  const encontrarItemsProblematicos = () => {
    const itemsPorComponente = {
      tecnico: { cdvfijo: [], cdvparque: [] },
      nutricion: { cdvfijo: [], cdvparque: [] },
      infraestructura: { cdvfijo: [], cdvparque: [] }
    };
    
    // Procesar ítems técnicos
    if (datos.porComponenteDetallado.tecnico?.items) {
      const agrupados = agruparItemsPorModalidad(datos.porComponenteDetallado.tecnico.items);
      itemsPorComponente.tecnico = obtenerPeoresItems(agrupados, 3);
    }
    
    // Procesar ítems nutrición
    if (datos.porComponenteDetallado.nutricion?.items) {
      const agrupados = agruparItemsPorModalidad(datos.porComponenteDetallado.nutricion.items);
      itemsPorComponente.nutricion = obtenerPeoresItems(agrupados, 3);
    }
    
    // Procesar ítems infraestructura
    if (datos.porComponenteDetallado.infraestructura?.items) {
      const agrupados = agruparItemsPorModalidad(datos.porComponenteDetallado.infraestructura.items);
      itemsPorComponente.infraestructura = obtenerPeoresItems(agrupados, 3);
    }
    
    return itemsPorComponente;
  };
  
  // Función para agrupar ítems por modalidad (Fijo/PEC)
  const agruparItemsPorModalidad = (items) => {
    const porModalidad = {
      cdvfijo: {},
      cdvparque: {}
    };
    
    items.forEach(item => {
      // Asegurarnos de obtener el tipo de espacio del ítem correctamente
      const tipoEspacio = item.tipoEspacio || inferirTipoEspacio(item);
      
      if (!porModalidad[tipoEspacio][item.id]) {
        porModalidad[tipoEspacio][item.id] = {
          id: item.id,
          label: item.label || '',
          valores: [],
          totalValor: 0,
          count: 0
        };
      }
      
      porModalidad[tipoEspacio][item.id].valores.push(item.valor);
      porModalidad[tipoEspacio][item.id].totalValor += (item.valor || 0);
      porModalidad[tipoEspacio][item.id].count += 1;
    });
    
    // Calcular promedios
    Object.keys(porModalidad).forEach(modalidad => {
      Object.keys(porModalidad[modalidad]).forEach(itemId => {
        const item = porModalidad[modalidad][itemId];
        if (item.count > 0) {
          item.promedio = Math.round(item.totalValor / item.count);
        }
      });
    });
    
    return porModalidad;
  };
  
  // Función mejorada para inferir el tipo de espacio basado en el contenido del ítem
  const inferirTipoEspacio = (item) => {
    // Si el ítem ya tiene tipoEspacio definido, usarlo directamente
    if (item.tipoEspacio) {
      return item.tipoEspacio;
    }
    
    // Para componente técnico, mejorar la detección
    if (item.id && item.id.startsWith('tecnico-')) {
      if (item.label) {
        const labelLower = item.label.toLowerCase();
        if (labelLower.includes('parque') || labelLower.includes('merienda') || 
            labelLower.includes('espacio comunitario')) {
          return 'cdvparque';
        }
        if (labelLower.includes('centro') || labelLower.includes('fijo') || 
            labelLower.includes('ración') || labelLower.includes('racion')) {
          return 'cdvfijo';
        }
      }
      
      // Si está asociado a un formulario específico, usar su contexto
      if (item.formularioId && datos && datos.formularios) {
        const formulario = datos.formularios.find(f => f.id === item.formularioId || f.formId === item.formularioId);
        if (formulario && formulario.tipoEspacio) {
          return formulario.tipoEspacio;
        }
      }
      
      // Si llegamos aquí y no pudimos determinar, verificar el número de ítem
      if (item.id.includes('-')) {
        const itemNum = parseInt(item.id.split('-')[1]);
        // Esta lógica debe adaptarse según la estructura específica
        if (itemNum > 10) {
          return 'cdvparque';  // Los ítems > 10 son para parque
        } else if (itemNum > 5) {
          return 'cdvfijo';    // Los ítems 6-10 son para fijo
        }
      }
    }
    
    // Si contiene la palabra "merienda" o "espacio comunitario" o "parque", es de tipo parque
    if (item.label && (
        item.label.toLowerCase().includes('merienda') || 
        item.label.toLowerCase().includes('espacio comunitario') ||
        item.label.toLowerCase().includes('parque') ||
        (item.displayText && (
          item.displayText.toLowerCase().includes('merienda') ||
          item.displayText.toLowerCase().includes('espacio comunitario') ||
          item.displayText.toLowerCase().includes('parque')
        ))
      )) {
      return 'cdvparque';
    }
    
    // Si contiene la palabra "ración" o "centro de vida" o "fijo", es de tipo fijo
    if (item.label && (
        item.label.toLowerCase().includes('ración') || 
        item.label.toLowerCase().includes('racion') ||
        item.label.toLowerCase().includes('centro de vida') ||
        item.label.toLowerCase().includes('fijo') ||
        (item.displayText && (
          item.displayText.toLowerCase().includes('ración') ||
          item.displayText.toLowerCase().includes('racion') ||
          item.displayText.toLowerCase().includes('centro de vida') ||
          item.displayText.toLowerCase().includes('fijo')
        ))
      )) {
      return 'cdvfijo';
    }
    
    // Para infraestructura
    if (item.id && item.id.startsWith('infraestructura-')) {
      if (item.label) {
        const labelLower = item.label.toLowerCase();
        if (labelLower.includes('espacio comunitario') || labelLower.includes('parque')) {
          return 'cdvparque';
        }
        if (labelLower.includes('centro de vida') || labelLower.includes('fijo')) {
          return 'cdvfijo';
        }
      }
      
      // Reglas específicas basadas en el número de ítem
      if (item.id.includes('-')) {
        const itemNum = parseInt(item.id.split('-')[1]);
        if (itemNum <= 3) {
          return 'cdvparque';  // Los primeros 3 ítems son para parque/espacio comunitario
        } else if (itemNum > 4) {
          return 'cdvfijo';    // Los ítems > 4 son solo para fijo
        }
      }
    }
    
    // Por defecto, asumimos cdvfijo si no podemos determinarlo
    return 'cdvfijo';
  };
  
  // Obtener los N items con peor desempeño por modalidad
  const obtenerPeoresItems = (itemsPorModalidad, cantidad) => {
    const resultado = {
      cdvfijo: [],
      cdvparque: []
    };
    
    // Para CDV Fijo
    const itemsFijo = Object.values(itemsPorModalidad.cdvfijo);
    if (itemsFijo.length > 0) {
      // Ordenar por promedio ascendente y tomar los primeros N
      const peoresItems = itemsFijo
        .sort((a, b) => a.promedio - b.promedio)
        .slice(0, cantidad);
      
      if (peoresItems.length > 0) {
        resultado.cdvfijo = peoresItems.map(item => ({
          ...item,
          modalidad: 'Centro de Vida Fijo'
        }));
      }
    }
    
    // Para CDV Parque/Espacio Comunitario
    const itemsPEC = Object.values(itemsPorModalidad.cdvparque);
    if (itemsPEC.length > 0) {
      // Ordenar por promedio ascendente y tomar los primeros N
      const peoresItems = itemsPEC
        .sort((a, b) => a.promedio - b.promedio)
        .slice(0, cantidad);
      
      if (peoresItems.length > 0) {
        resultado.cdvparque = peoresItems.map(item => ({
          ...item,
          modalidad: 'Centro de Vida Parque/Espacio Comunitario'
        }));
      }
    }
    
    return resultado;
  };
  
  // Obtener color de ítem según promedio
  const getColorByPromedio = (promedio) => {
    if (promedio < 40) return { color: 'error', bg: '#ffebee', icon: <PriorityHighIcon /> };
    if (promedio < 60) return { color: 'error', bg: '#ffebee', icon: <ErrorIcon /> };
    if (promedio < 80) return { color: 'warning', bg: '#fff8e1', icon: <WarningIcon /> };
    return { color: 'success', bg: '#e8f5e9', icon: <ReportProblemIcon /> };
  };
  
  // Obtener color por valor
  const getColorByValue = (value) => {
    if (value < 60) return 'error';
    if (value < 80) return 'warning';
    return 'success';
  };
  
  // Obtener background por valor
  const getBgColorByValue = (value) => {
    if (value < 60) return '#ffebee';
    if (value < 80) return '#fff8e1';
    return '#e8f5e9';
  };
  
  const itemsProblematicos = encontrarItemsProblematicos();
  
  return (
    <Paper sx={{ mt: 1, p: 3, bgcolor: '#fff' }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Áreas que Requieren Atención
      </Typography>
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{ mb: 3 }}
      >
        <Tab label="Espacios" />
        <Tab label="Ítems por Componente" />
      </Tabs>
      
      {/* Tab de Espacios */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Centro de Vida Fijo */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardHeader
                title="Centro de Vida Fijo"
                subheader="Espacios específicos con menor cumplimiento"
              />
              <CardContent>
                <Grid container spacing={2}>
                  {espaciosPorModalidad.cdvfijo.length > 0 ? (
                    espaciosPorModalidad.cdvfijo.map((espacio, index) => (
                      <Grid item xs={12} md={4} key={`fijo-${index}`}>
                        <Paper
                          elevation={1}
                          sx={{ 
                            p: 2,
                            borderLeft: `4px solid ${espacio.promedio < 60 ? '#f44336' : espacio.promedio < 80 ? '#ff9800' : '#4caf50'}`,
                            bgcolor: getBgColorByValue(espacio.promedio),
                            borderRadius: '4px',
                            height: '100%'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                            <LocationOnIcon sx={{ mt: 0.5, mr: 1, color: getColorByValue(espacio.promedio) }} />
                            <Box>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {espacio.nombre}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <BusinessIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />
                                  {espacio.contratista}
                                </Box>
                              </Typography>
                              
                              {/* Añadir fecha de última visita */}
                              <Typography variant="caption" color="textSecondary">
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />
                                  Última: {formatearFecha(espacio.ultimaFecha)}
                                </Box>
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                                Cumplimiento
                              </Typography>
                              
                              {/* Añadir indicador de tendencia */}
                              {espacio.tendencia !== undefined && (
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  color: espacio.tendencia > 0 ? '#2e7d32' : 
                                         espacio.tendencia < 0 ? '#d32f2f' : 
                                         '#757575'
                                }}>
                                  {espacio.tendencia > 0 ? (
                                    <TrendingUpIcon fontSize="small" />
                                  ) : espacio.tendencia < 0 ? (
                                    <TrendingDownIcon fontSize="small" />
                                  ) : (
                                    <TrendingFlatIcon fontSize="small" />
                                  )}
                                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                                    {espacio.tendencia > 0 ? '+' : ''}{espacio.tendencia}%
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            
                            <Chip 
                              label={`${espacio.promedio}%`} 
                              size="small"
                              color={getColorByValue(espacio.promedio)}
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body2" align="center" color="textSecondary">
                        No hay datos de espacios de atención para Centro de Vida Fijo
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Centro de Vida Parque/Espacio Comunitario - Cambiado el nombre */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardHeader
                title="Centro de Vida Parque/Espacio Comunitario"
                subheader="Espacios específicos con menor cumplimiento"
              />
              <CardContent>
                <Grid container spacing={2}>
                  {espaciosPorModalidad.cdvparque.length > 0 ? (
                    espaciosPorModalidad.cdvparque.map((espacio, index) => (
                      <Grid item xs={12} md={4} key={`parque-${index}`}>
                        <Paper
                          elevation={1}
                          sx={{ 
                            p: 2,
                            borderLeft: `4px solid ${espacio.promedio < 60 ? '#f44336' : espacio.promedio < 80 ? '#ff9800' : '#4caf50'}`,
                            bgcolor: getBgColorByValue(espacio.promedio),
                            borderRadius: '4px',
                            height: '100%'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                            <LocationOnIcon sx={{ mt: 0.5, mr: 1, color: getColorByValue(espacio.promedio) }} />
                            <Box>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {espacio.nombre}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <BusinessIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />
                                  {espacio.contratista}
                                </Box>
                              </Typography>
                              
                              {/* Añadir fecha de última visita */}
                              <Typography variant="caption" color="textSecondary">
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />
                                  Última: {formatearFecha(espacio.ultimaFecha)}
                                </Box>
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                                Cumplimiento
                              </Typography>
                              
                              {/* Añadir indicador de tendencia */}
                              {espacio.tendencia !== undefined && (
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  color: espacio.tendencia > 0 ? '#2e7d32' : 
                                         espacio.tendencia < 0 ? '#d32f2f' : 
                                         '#757575'
                                }}>
                                  {espacio.tendencia > 0 ? (
                                    <TrendingUpIcon fontSize="small" />
                                  ) : espacio.tendencia < 0 ? (
                                    <TrendingDownIcon fontSize="small" />
                                  ) : (
                                    <TrendingFlatIcon fontSize="small" />
                                  )}
                                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                                    {espacio.tendencia > 0 ? '+' : ''}{espacio.tendencia}%
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            
                            <Chip 
                              label={`${espacio.promedio}%`} 
                              size="small"
                              color={getColorByValue(espacio.promedio)}
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body2" align="center" color="textSecondary">
                        No hay datos de espacios de atención para Parques/Espacios Comunitarios
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Contratistas */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardHeader
                title="Contratistas con Menor Desempeño"
                subheader="Entidades que requieren mayor atención"
              />
              <CardContent>
                <Grid container spacing={2}>
                  {contratistasProblematicos.length > 0 ? (
                    contratistasProblematicos.map((contratista, index) => (
                      <Grid item xs={12} md={4} key={`contratista-${index}`}>
                        <Paper
                          elevation={1}
                          sx={{ 
                            p: 2,
                            borderLeft: `4px solid ${contratista.promedio < 60 ? '#f44336' : contratista.promedio < 80 ? '#ff9800' : '#4caf50'}`,
                            bgcolor: getBgColorByValue(contratista.promedio),
                            borderRadius: '4px',
                            height: '100%'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <BusinessIcon sx={{ mr: 1, color: getColorByValue(contratista.promedio) }} />
                            <Typography variant="subtitle1" fontWeight="medium">
                              {contratista.nombre}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="textSecondary">
                              Cumplimiento promedio
                            </Typography>
                            <Chip 
                              label={`${contratista.promedio}%`} 
                              size="small"
                              color={getColorByValue(contratista.promedio)}
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body2" align="center" color="textSecondary">
                        No hay datos suficientes de contratistas
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Tab de Ítems por Componente */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Sección de Técnico */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: '#2196f3' }}>T</Avatar>
                }
                title="Componente Técnico"
                subheader="Ítems con menor cumplimiento"
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Centros de Vida Fijo
                  </Typography>
                  <List dense disablePadding>
                    {itemsProblematicos.tecnico.cdvfijo.map((item, idx) => {
                      const { color, bg, icon } = getColorByPromedio(item.promedio);
                      return (
                        <ListItem 
                          key={`fijo-${item.id}-${idx}`}
                          sx={{ 
                            borderLeft: `4px solid ${color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}`,
                            bgcolor: bg,
                            mb: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" noWrap>
                                  {item.id}
                                </Typography>
                                <Chip 
                                  label={`${item.promedio}%`} 
                                  size="small"
                                  color={color}
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem' }}>
                                {item.label?.length > 60 ? `${item.label.substring(0, 60)}...` : item.label}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Parques/Espacios Comunitarios
                  </Typography>
                  <List dense disablePadding>
                    {itemsProblematicos.tecnico.cdvparque.map((item, idx) => {
                      const { color, bg, icon } = getColorByPromedio(item.promedio);
                      return (
                        <ListItem 
                          key={`parque-${item.id}-${idx}`}
                          sx={{ 
                            borderLeft: `4px solid ${color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}`,
                            bgcolor: bg,
                            mb: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" noWrap>
                                  {item.id}
                                </Typography>
                                <Chip 
                                  label={`${item.promedio}%`} 
                                  size="small"
                                  color={color}
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem' }}>
                                {item.label?.length > 60 ? `${item.label.substring(0, 60)}...` : item.label}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Sección de Nutrición */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: '#4caf50' }}>N</Avatar>
                }
                title="Componente Nutrición"
                subheader="Ítems con menor cumplimiento"
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Centros de Vida Fijo
                  </Typography>
                  <List dense disablePadding>
                    {itemsProblematicos.nutricion.cdvfijo.map((item, idx) => {
                      const { color, bg, icon } = getColorByPromedio(item.promedio);
                      return (
                        <ListItem 
                          key={`fijo-${item.id}-${idx}`}
                          sx={{ 
                            borderLeft: `4px solid ${color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}`,
                            bgcolor: bg,
                            mb: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" noWrap>
                                  {item.id}
                                </Typography>
                                <Chip 
                                  label={`${item.promedio}%`} 
                                  size="small"
                                  color={color}
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem' }}>
                                {item.label?.length > 60 ? `${item.label.substring(0, 60)}...` : item.label}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Parques/Espacios Comunitarios
                  </Typography>
                  <List dense disablePadding>
                    {itemsProblematicos.nutricion.cdvparque.map((item, idx) => {
                      const { color, bg, icon } = getColorByPromedio(item.promedio);
                      return (
                        <ListItem 
                          key={`parque-${item.id}-${idx}`}
                          sx={{ 
                            borderLeft: `4px solid ${color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}`,
                            bgcolor: bg,
                            mb: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" noWrap>
                                  {item.id}
                                </Typography>
                                <Chip 
                                  label={`${item.promedio}%`} 
                                  size="small"
                                  color={color}
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem' }}>
                                {item.label?.length > 60 ? `${item.label.substring(0, 60)}...` : item.label}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Sección de Infraestructura */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: '#ff9800' }}>I</Avatar>
                }
                title="Componente Infraestructura"
                subheader="Ítems con menor cumplimiento"
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Centros de Vida Fijo
                  </Typography>
                  <List dense disablePadding>
                    {itemsProblematicos.infraestructura.cdvfijo.map((item, idx) => {
                      const { color, bg, icon } = getColorByPromedio(item.promedio);
                      return (
                        <ListItem 
                          key={`fijo-${item.id}-${idx}`}
                          sx={{ 
                            borderLeft: `4px solid ${color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}`,
                            bgcolor: bg,
                            mb: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" noWrap>
                                  {item.id}
                                </Typography>
                                <Chip 
                                  label={`${item.promedio}%`} 
                                  size="small"
                                  color={color}
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem' }}>
                                {item.label?.length > 60 ? `${item.label.substring(0, 60)}...` : item.label}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Parques/Espacios Comunitarios
                  </Typography>
                  <List dense disablePadding>
                    {itemsProblematicos.infraestructura.cdvparque.map((item, idx) => {
                      const { color, bg, icon } = getColorByPromedio(item.promedio);
                      return (
                        <ListItem 
                          key={`parque-${item.id}-${idx}`}
                          sx={{ 
                            borderLeft: `4px solid ${color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}`,
                            bgcolor: bg,
                            mb: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" noWrap>
                                  {item.id}
                                </Typography>
                                <Chip 
                                  label={`${item.promedio}%`} 
                                  size="small"
                                  color={color}
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem' }}>
                                {item.label?.length > 60 ? `${item.label.substring(0, 60)}...` : item.label}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default ItemsAlertaComponent;