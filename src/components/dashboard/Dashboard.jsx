import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box, CircularProgress, Alert, Divider, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PersonIcon from '@mui/icons-material/Person';
import DashboardFilters from './DashboardFilters';
import CumplimientoChart from './CumplimientoChart';
import ContratistasChart from './ContratistasChart';
import EspaciosChart from './EspaciosChart';
import ComponenteDetailView from './ComponenteDetailView';
import ItemsAlertaComponent from './ItemsAlertaComponent';
import TendenciasTemporalesChart from './TendenciasTemporalesChart';
import EscalafonSupervisionComponent from './EscalafonSupervisionComponent';
import AlertasComponent from './AlertasComponent';
import { getFormulariosDashboard, calcularMetricasDashboard } from '../../services/dashboardService';

const Dashboard = ({ user }) => {
  const [formularios, setFormularios] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    tipoEspacio: 'todos',
    contratista: 'todos'
  });
  const [componenteSeleccionado, setComponenteSeleccionado] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos(filtros);
  }, []);

  // Función para cargar datos del dashboard
  const cargarDatos = async (filtrosActuales) => {
    setCargando(true);
    setError(null);
    
    try {
      console.log("Cargando datos con filtros:", filtrosActuales);
      const datos = await getFormulariosDashboard(filtrosActuales);
      console.log("Datos obtenidos:", datos);
      setFormularios(datos);
      
      // Calcular métricas
      const metricasCalculadas = calcularMetricasDashboard(datos);
      console.log("Métricas calculadas:", metricasCalculadas);
      setMetricas(metricasCalculadas);
      
      // Actualizar timestamp
      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  // Manejar cambios en filtros
  const handleFilterChange = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    cargarDatos(nuevosFiltros);
  };
  
  // Función para exportar datos a CSV
  const exportarCSV = () => {
    if (!formularios || formularios.length === 0) {
      return;
    }
    
    // Crear cabeceras
    const cabeceras = [
      'Fecha', 'Hora', 'Contratista', 'Tipo de Espacio', 'Espacio de Atención',
      'Apoyo a la Supervisión', 'Personas Mayores', 'Puntuación Total', '% Cumplimiento'
    ].join(',');
    
    // Crear filas
    const filas = formularios.map(form => {
      const tipoEspacio = form.tipoEspacio === 'cdvfijo' ? 'Centro de Vida Fijo' : 
                          form.tipoEspacio === 'cdvparque' ? 'Centro de Vida Parque/Espacio Comunitario' : 
                          form.tipoEspacio || '';
      
      return [
        form.fechaVisita || '',
        form.horaVisita || '',
        `"${(form.contratista || '').replace(/"/g, '""')}"`, // Escapar comillas
        `"${tipoEspacio}"`,
        `"${(form.espacioAtencion || '').replace(/"/g, '""')}"`,
        `"${(form.apoyoSupervision || '').replace(/"/g, '""')}"`,
        form.pmAsistentes || 0,
        form.puntajeTotal || 0,
        `${form.porcentajeCumplimiento || 0}%`
      ].join(',');
    }).join('\n');
    
    // Combinar todo
    const csvContent = `${cabeceras}\n${filas}`;
    
    // Crear blob y enlace para descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Visitas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para manejar la selección de componente para ver detalles
  const handleComponenteSelect = (componente) => {
    setComponenteSeleccionado(componente);
  };

  // Función para cerrar la vista detallada
  const handleCloseDetail = () => {
    setComponenteSeleccionado(null);
  };

  // Calcular los puntos totales y máximos para todos los componentes
  const calcularPuntosTotales = () => {
    if (!metricas || !metricas.porComponenteDetallado) return { total: 0, maximo: 0 };

    const total = (
      (metricas.porComponenteDetallado.tecnico?.puntosTotales || 0) +
      (metricas.porComponenteDetallado.nutricion?.puntosTotales || 0) +
      (metricas.porComponenteDetallado.infraestructura?.puntosTotales || 0)
    );
    
    const maximo = (
      (metricas.porComponenteDetallado.tecnico?.puntosMaximos || 0) +
      (metricas.porComponenteDetallado.nutricion?.puntosMaximos || 0) +
      (metricas.porComponenteDetallado.infraestructura?.puntosMaximos || 0)
    );
    
    return { total, maximo };
  };

  // Función para calcular el cumplimiento promedio por tipo de espacio
  const calcularCumplimientoPorTipo = (tipo) => {
    if (!formularios || formularios.length === 0) return 0;
    
    const formulariosFiltrados = formularios.filter(form => form.tipoEspacio === tipo);
    if (formulariosFiltrados.length === 0) return 0;
    
    const sumaCumplimiento = formulariosFiltrados.reduce((sum, form) => 
      sum + (Number(form.porcentajeCumplimiento) || 0), 0);
    
    return Math.round(sumaCumplimiento / formulariosFiltrados.length);
  };

  // Función para contar visitas por tipo de espacio
  const contarVisitasPorTipo = (tipo) => {
    if (!formularios || formularios.length === 0) return 0;
    return formularios.filter(form => form.tipoEspacio === tipo).length;
  };

  // Función para calcular puntos obtenidos y posibles por tipo de espacio
  const calcularPuntosPorTipo = (tipo) => {
    if (!formularios || formularios.length === 0 || !metricas || !metricas.porComponenteDetallado) 
      return { obtenidos: 0, posibles: 0 };
    
    const formulariosFiltrados = formularios.filter(form => form.tipoEspacio === tipo);
    if (formulariosFiltrados.length === 0) return { obtenidos: 0, posibles: 0 };
    
    // Acumular puntos para esta modalidad específica
    let puntosObtenidos = 0;
    let puntosPosibles = 0;
    
    formulariosFiltrados.forEach(form => {
      // Sumar puntos de todos los componentes
      if (form.puntajePorComponente) {
        Object.values(form.puntajePorComponente).forEach(comp => {
          if (comp.total !== undefined && comp.maxPuntos !== undefined) {
            puntosObtenidos += Number(comp.total) || 0;
            puntosPosibles += Number(comp.maxPuntos) || 0;
          }
        });
      }
    });
    
    return { 
      obtenidos: Math.round(puntosObtenidos), 
      posibles: Math.round(puntosPosibles)
    };
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Dashboard de Supervisión
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" align="center" sx={{ mb: 4 }}>
          Visualización de datos de visitas y cumplimiento
        </Typography>

        {/* Filtros */}
        <DashboardFilters 
          onFilterChange={handleFilterChange} 
          initialFilters={filtros}
        />

        {/* Botones de acciones */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => cargarDatos(filtros)}
            disabled={cargando}
          >
            Actualizar datos
          </Button>
          
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />}
            onClick={exportarCSV}
            disabled={cargando || formularios.length === 0}
          >
            Exportar a CSV
          </Button>
        </Box>

        {/* Indicadores principales */}
        {cargando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 5, height: 200 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Cargando datos...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 3 }}>
            {error}
          </Alert>
        ) : (
          <>
            {/* Mensaje si no hay datos */}
            {formularios.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', my: 4 }}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No se encontraron datos
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  No hay visitas que coincidan con los filtros seleccionados.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={() => handleFilterChange({
                    fechaInicio: '',
                    fechaFin: '',
                    tipoEspacio: 'todos',
                    contratista: 'todos'
                  })}
                >
                  Limpiar filtros
                </Button>
              </Paper>
            ) : (
              <>
                {/* Tarjetas de resumen mejoradas */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {/* Primera fila: Resumen general */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                      <Typography variant="h6" color="textSecondary">Total Visitas</Typography>
                      <Typography variant="h3" sx={{ mt: 2, fontWeight: 'bold' }}>
                        {metricas?.totalVisitas || 0}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-around' }}>
                        <Typography variant="body2" color="textSecondary">
                          Centros Fijos: <strong>{contarVisitasPorTipo('cdvfijo')}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Parques/EC: <strong>{contarVisitasPorTipo('cdvparque')}</strong>
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={8}>
                    <Paper sx={{ p: 3, bgcolor: '#e8f5e9' }}>
                      <Typography variant="h6" color="textSecondary" align="center" gutterBottom>
                        Cumplimiento
                      </Typography>
                      <Grid container spacing={2}>
                        {/* Cumplimiento Global */}
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center', border: '1px solid #e0e0e0', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" color="textSecondary">Global</Typography>
                            <Typography variant="h4" sx={{ 
                              fontWeight: 'bold', 
                              color: (metricas?.promedioCumplimiento || 0) >= 80 ? '#2e7d32' : 
                                    (metricas?.promedioCumplimiento || 0) >= 60 ? '#f57c00' : 
                                    '#d32f2f'
                            }}>
                              {metricas?.promedioCumplimiento || 0}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {calcularPuntosTotales().total}/{calcularPuntosTotales().maximo} pts
                            </Typography>
                          </Box>
                        </Grid>
                        
                        {/* Cumplimiento Centros Fijos */}
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center', border: '1px solid #e0e0e0', p: 2, borderRadius: 1, bgcolor: '#e8eaf6' }}>
                            <Typography variant="subtitle2" color="textSecondary">Centros Fijos</Typography>
                            <Typography variant="h4" sx={{ 
                              fontWeight: 'bold', 
                              color: calcularCumplimientoPorTipo('cdvfijo') >= 80 ? '#2e7d32' : 
                                    calcularCumplimientoPorTipo('cdvfijo') >= 60 ? '#f57c00' : 
                                    '#d32f2f'
                            }}>
                              {calcularCumplimientoPorTipo('cdvfijo')}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {calcularPuntosPorTipo('cdvfijo').obtenidos}/{calcularPuntosPorTipo('cdvfijo').posibles} pts
                            </Typography>
                          </Box>
                        </Grid>
                        
                        {/* Cumplimiento Parques/Espacios Comunitarios */}
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center', border: '1px solid #e0e0e0', p: 2, borderRadius: 1, bgcolor: '#fce4ec' }}>
                            <Typography variant="subtitle2" color="textSecondary">Parques/Espacios Comunitarios</Typography>
                            <Typography variant="h4" sx={{ 
                              fontWeight: 'bold', 
                              color: calcularCumplimientoPorTipo('cdvparque') >= 80 ? '#2e7d32' : 
                                    calcularCumplimientoPorTipo('cdvparque') >= 60 ? '#f57c00' : 
                                    '#d32f2f'
                            }}>
                              {calcularCumplimientoPorTipo('cdvparque')}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {calcularPuntosPorTipo('cdvparque').obtenidos}/{calcularPuntosPorTipo('cdvparque').posibles} pts
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Métrica de PM Asistentes */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f0f4c3' }}>
                      <Typography variant="h6" color="textSecondary">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PersonIcon sx={{ mr: 1 }} />
                          PM Asistentes (Total)
                        </Box>
                      </Typography>
                      <Typography variant="h3" sx={{ mt: 2, fontWeight: 'bold' }}>
                        {metricas?.totalPmAsistentes || 0}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Promedio: {metricas?.promedioPmAsistentes || 0} por visita
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* PM por tipo de espacio */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8eaf6' }}>
                      <Typography variant="subtitle2" color="textSecondary">PM - Centros Fijos</Typography>
                      <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                        {metricas?.pmPorTipoEspacio?.fijo || 0}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        promedio por visita
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fce4ec' }}>
                      <Typography variant="subtitle2" color="textSecondary">PM - Parques/Espacios Comunitarios</Typography>
                      <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                        {metricas?.pmPorTipoEspacio?.parque || 0}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        promedio por visita
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Sección de Alertas del Sistema */}
                <Grid container spacing={4} sx={{ mb: 4 }}>
                  <Grid item xs={12}>
                    <AlertasComponent datos={{...metricas, formularios: formularios}} />
                  </Grid>
                </Grid>

                {/* Sección mejorada de Alertas */}
                <Grid container spacing={4} sx={{ mb: 4 }}>
                  <Grid item xs={12}>
                    <ItemsAlertaComponent datos={{...metricas, formularios: formularios}} />
                  </Grid>
                </Grid>
                
                {/* Gráficos principales */}
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <CumplimientoChart datos={metricas} />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <ContratistasChart datos={metricas} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TendenciasTemporalesChart datos={metricas} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <EspaciosChart 
                      datos={metricas} 
                      onSelectComponente={handleComponenteSelect}
                    />
                  </Grid>
                </Grid>
                
                {/* Escalafón de Supervisión - MOVIDO AL FINAL */}
                <Grid container spacing={4} sx={{ my: 4 }}>
                  <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 3, fontWeight: "medium", color: "#424242" }}>
                      Detalle de Ejecución por Supervisores
                    </Typography>
                    <EscalafonSupervisionComponent datos={{...metricas, formularios: formularios}} />
                  </Grid>
                </Grid>
                
                {/* Tabla de filtros aplicados */}
                <Paper sx={{ mt: 4, p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Filtros aplicados
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="subtitle2">Fecha Inicio:</Typography>
                      <Typography variant="body1">
                        {filtros.fechaInicio ? filtros.fechaInicio : 'No especificada'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="subtitle2">Fecha Fin:</Typography>
                      <Typography variant="body1">
                        {filtros.fechaFin ? filtros.fechaFin : 'No especificada'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="subtitle2">Tipo de Espacio:</Typography>
                      <Typography variant="body1">
                        {filtros.tipoEspacio === 'todos' ? 'Todos' : 
                         filtros.tipoEspacio === 'cdvfijo' ? 'Centro de Vida Fijo' : 
                         'Centro de Vida Parque/Espacio Comunitario'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="subtitle2">Contratista:</Typography>
                      <Typography variant="body1">
                        {filtros.contratista === 'todos' ? 'Todos' : filtros.contratista}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Mostrando {formularios.length} resultado(s) que cumplen con los criterios.
                    </Typography>
                    
                    {ultimaActualizacion && (
                      <Typography variant="body2" color="textSecondary">
                        Última actualización: {ultimaActualizacion.toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </>
            )}
          </>
        )}
      </Box>

      {/* Ventana de detalle de componente */}
      {componenteSeleccionado && (
        <ComponenteDetailView
          componente={componenteSeleccionado}
          datos={metricas}
          onClose={handleCloseDetail}
        />
      )}
    </Container>
  );
};

export default Dashboard;