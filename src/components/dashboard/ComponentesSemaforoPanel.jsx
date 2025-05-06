import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  LinearProgress, 
  Divider, 
  Button 
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const ComponentesSemaforoPanel = ({ datos, onSelectComponente }) => {
  if (!datos || !datos.porComponenteDetallado) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles para mostrar
        </Typography>
      </Paper>
    );
  }
  
  // Función para obtener color basado en porcentaje
  const getStatusColor = (percentage) => {
    if (percentage >= 80) return '#4caf50'; // Verde
    if (percentage >= 60) return '#ff9800'; // Amarillo
    return '#f44336'; // Rojo
  };
  
  // Función para obtener ícono basado en porcentaje
  const getStatusIcon = (percentage) => {
    if (percentage >= 80) return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
    if (percentage >= 60) return <WarningIcon sx={{ color: '#ff9800' }} />;
    return <ErrorIcon sx={{ color: '#f44336' }} />;
  };
  
  // Obtener el puntaje total general
  const puntajeTotalGeneral = 
    (datos.porComponenteDetallado.tecnico?.puntosTotales || 0) +
    (datos.porComponenteDetallado.nutricion?.puntosTotales || 0) +
    (datos.porComponenteDetallado.infraestructura?.puntosTotales || 0);
    
  const puntajeMaximoGeneral = 
    (datos.porComponenteDetallado.tecnico?.puntosMaximos || 0) +
    (datos.porComponenteDetallado.nutricion?.puntosMaximos || 0) +
    (datos.porComponenteDetallado.infraestructura?.puntosMaximos || 0);
  
  // Información de los componentes
  const componentes = [
    {
      id: 'tecnico',
      nombre: 'Componente Técnico',
      porcentaje: datos.porComponenteDetallado.tecnico?.porcentaje || 0,
      puntosTotales: datos.porComponenteDetallado.tecnico?.puntosTotales || 0,
      puntosMaximos: datos.porComponenteDetallado.tecnico?.puntosMaximos || 0,
      tendencia: 'up' // Simulación: esto debería venir de datos históricos reales
    },
    {
      id: 'nutricion',
      nombre: 'Componente Nutrición',
      porcentaje: datos.porComponenteDetallado.nutricion?.porcentaje || 0,
      puntosTotales: datos.porComponenteDetallado.nutricion?.puntosTotales || 0,
      puntosMaximos: datos.porComponenteDetallado.nutricion?.puntosMaximos || 0,
      tendencia: 'stable' // Simulación: esto debería venir de datos históricos reales
    },
    {
      id: 'infraestructura',
      nombre: 'Componente Infraestructura',
      porcentaje: datos.porComponenteDetallado.infraestructura?.porcentaje || 0,
      puntosTotales: datos.porComponenteDetallado.infraestructura?.puntosTotales || 0,
      puntosMaximos: datos.porComponenteDetallado.infraestructura?.puntosMaximos || 0,
      tendencia: 'down' // Simulación: esto debería venir de datos históricos reales
    }
  ];
  
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" align="center" gutterBottom>
        Análisis de Componentes
      </Typography>
      
      {/* Resumen general */}
      <Box 
        sx={{ 
          mb: 3, 
          mt: 2,
          p: 2, 
          bgcolor: '#f8f9fa',
          borderRadius: 2,
          border: '1px solid #e0e0e0',
          textAlign: 'center'
        }}
      >
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Cumplimiento General
        </Typography>
        <Typography 
          variant="h4" 
          fontWeight="bold" 
          sx={{ color: getStatusColor(datos.promedioCumplimiento) }}
        >
          {datos.promedioCumplimiento}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {puntajeTotalGeneral}/{puntajeMaximoGeneral} puntos totales
        </Typography>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Semáforo de componentes */}
      <Grid container spacing={2}>
        {componentes.map((componente) => (
          <Grid item xs={12} key={componente.id}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                backgroundColor: '#fff',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: '0 3px 6px rgba(0,0,0,0.16)',
                  transform: 'translateY(-2px)'
                },
                cursor: 'pointer',
                borderLeft: `10px solid ${getStatusColor(componente.porcentaje)}`
              }}
              onClick={() => onSelectComponente(componente.id)}
            >
              <Grid container alignItems="center" spacing={2}>
                <Grid item>
                  {getStatusIcon(componente.porcentaje)}
                </Grid>
                <Grid item xs>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {componente.nombre}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={componente.porcentaje} 
                      sx={{ 
                        flexGrow: 1,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getStatusColor(componente.porcentaje)
                        }
                      }}
                    />
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        ml: 2,
                        fontWeight: 'bold',
                        color: getStatusColor(componente.porcentaje)
                      }}
                    >
                      {componente.porcentaje}%
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {componente.puntosTotales}/{componente.puntosMaximos} pts
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {componente.tendencia === 'up' && (
                        <TrendingUpIcon fontSize="small" sx={{ color: '#4caf50', mr: 0.5 }} />
                      )}
                      {componente.tendencia === 'down' && (
                        <TrendingDownIcon fontSize="small" sx={{ color: '#f44336', mr: 0.5 }} />
                      )}
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: componente.tendencia === 'up' ? '#4caf50' : 
                                componente.tendencia === 'down' ? '#f44336' : 
                                'text.secondary'
                        }}
                      >
                        {componente.tendencia === 'up' ? '+5% vs. anterior' : 
                          componente.tendencia === 'down' ? '-3% vs. anterior' : 
                          'Sin cambios'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectComponente(componente.id);
                    }}
                    sx={{ 
                      borderColor: getStatusColor(componente.porcentaje),
                      color: getStatusColor(componente.porcentaje)
                    }}
                  >
                    Ver Detalles
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default ComponentesSemaforoPanel;