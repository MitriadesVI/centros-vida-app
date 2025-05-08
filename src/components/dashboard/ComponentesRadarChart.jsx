import React from 'react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';

const ComponentesRadarChart = ({ datos }) => {
  const theme = useTheme();
  
  // Si no hay datos, mostrar mensaje
  if (!datos || !datos.porComponente) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles para mostrar
        </Typography>
      </Paper>
    );
  }

  // Preparar datos para el radar
  const radarData = [
    {
      subject: 'Técnico',
      value: datos.porComponenteDetallado?.tecnico?.porcentaje || 0,
      fullMark: 100,
      puntos: `${datos.porComponenteDetallado?.tecnico?.puntosTotales || 0}/${datos.porComponenteDetallado?.tecnico?.puntosMaximos || 0}`,
    },
    {
      subject: 'Nutrición',
      value: datos.porComponenteDetallado?.nutricion?.porcentaje || 0,
      fullMark: 100,
      puntos: `${datos.porComponenteDetallado?.nutricion?.puntosTotales || 0}/${datos.porComponenteDetallado?.nutricion?.puntosMaximos || 0}`,
    },
    {
      subject: 'Infraestructura',
      value: datos.porComponenteDetallado?.infraestructura?.porcentaje || 0,
      fullMark: 100,
      puntos: `${datos.porComponenteDetallado?.infraestructura?.puntosTotales || 0}/${datos.porComponenteDetallado?.infraestructura?.puntosMaximos || 0}`,
    }
  ];

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom align="center">
        Análisis de Componentes
      </Typography>
      
      <Box sx={{ height: 350, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart outerRadius={120} width={500} height={350} data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="% Cumplimiento"
              dataKey="value"
              stroke={theme.palette.primary.main}
              fill={theme.palette.primary.main}
              fillOpacity={0.6}
            />
            <Tooltip formatter={(value, name, props) => [`${value}% (${props.payload.puntos})`, name]} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ComponentesRadarChart;