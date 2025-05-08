import React from 'react';
import { Paper, Typography, Box, Chip, Divider, Grid, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

const ComponentesSemaforoPanel = ({ datos, onSelectComponente }) => {
  if (!datos || !datos.porComponente || !datos.porComponente.promedios) {
    return (
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="textSecondary">
          No hay datos disponibles para mostrar el semáforo de componentes.
        </Typography>
      </Paper>
    );
  }

  // Extraer datos de componentes
  const { promedios, nombres, detallado } = datos.porComponente;
  
  // Determinar el color y el ícono según el promedio
  const getColorAndIcon = (promedio) => {
    if (promedio >= 80) {
      return { color: 'success.main', bgColor: '#e8f5e9', icon: <CheckCircleIcon /> };
    } else if (promedio >= 60) {
      return { color: 'warning.main', bgColor: '#fff8e1', icon: <WarningIcon /> };
    } else {
      return { color: 'error.main', bgColor: '#ffebee', icon: <ErrorIcon /> };
    }
  };

  // Función para contar formularios por tipo de espacio y componente
  const contarFormulariosPorTipoEspacio = (componente, tipoEspacio) => {
    // Si no tenemos los formularios originales, usamos una estimación
    if (!datos.formularios) {
      return 0;
    }
    
    // Filtrar formularios por componente y tipo de espacio
    return datos.formularios.filter(form => {
      // Verificar si el formulario tiene datos para este componente
      const tieneComponente = 
        (componente === 'tecnico' && form.puntajePorComponente && form.puntajePorComponente['COMPONENTE TÉCNICO']) ||
        (componente === 'nutricion' && form.puntajePorComponente && form.puntajePorComponente['COMPONENTE NUTRICIÓN Y ALIMENTACIÓN']) ||
        (componente === 'infraestructura' && form.puntajePorComponente && form.puntajePorComponente['COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN']);
      
      // Verificar el tipo de espacio
      const coincideTipoEspacio = form.tipoEspacio === tipoEspacio;
      
      return tieneComponente && coincideTipoEspacio;
    }).length;
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Semáforo de Componentes
        </Typography>
        
        <Box>
          <Chip
            label="Verde ≥ 80%"
            size="small"
            sx={{ backgroundColor: '#e8f5e9', color: 'success.main', mr: 1 }}
          />
          <Chip
            label="Amarillo ≥ 60%"
            size="small"
            sx={{ backgroundColor: '#fff8e1', color: 'warning.main', mr: 1 }}
          />
          <Chip
            label="Rojo < 60%"
            size="small"
            sx={{ backgroundColor: '#ffebee', color: 'error.main' }}
          />
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Grid container spacing={3}>
        {promedios.map((promedio, index) => {
          const componente = index === 0 ? 'tecnico' : index === 1 ? 'nutricion' : 'infraestructura';
          const componenteData = detallado[componente];
          const { color, bgColor, icon } = getColorAndIcon(promedio);
          
          // Contar formularios por tipo de espacio
          const fijosFormularios = contarFormulariosPorTipoEspacio(componente, 'cdvfijo');
          const parquesFormularios = contarFormulariosPorTipoEspacio(componente, 'cdvparque');
          
          return (
            <Grid item xs={12} md={4} key={index}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  backgroundColor: bgColor,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ mr: 2, color }}>{icon}</Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                      {nombres[index]}
                    </Typography>
                  </Box>
                  
                  <Typography
                    variant="h3"
                    component="div"
                    align="center"
                    sx={{ color, fontWeight: 'bold', my: 2 }}
                  >
                    {promedio}%
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Puntos obtenidos:</span>
                      <strong>{componenteData.puntosTotales}/{componenteData.puntosMaximos}</strong>
                    </Typography>
                    
                    <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <span>Formularios evaluados:</span>
                      <strong>{componenteData.numFormularios}</strong>
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      <strong>Centros Fijos:</strong>
                    </Typography>
                    <Typography variant="body2">
                      <strong>{fijosFormularios}</strong> evaluaciones
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      <strong>Espacios Comunitarios:</strong>
                    </Typography>
                    <Typography variant="body2">
                      <strong>{parquesFormularios}</strong> evaluaciones
                    </Typography>
                  </Box>
                </Box>
                
                <Button
                  variant="outlined"
                  sx={{ mt: 3, borderColor: color, color, '&:hover': { borderColor: color } }}
                  onClick={() => onSelectComponente(componente)}
                >
                  Ver Detalles
                </Button>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default ComponentesSemaforoPanel;