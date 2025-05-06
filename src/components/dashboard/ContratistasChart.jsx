import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';

const ContratistasChart = ({ datos }) => {
  const theme = useTheme();
  
  // Si no hay datos, mostrar mensaje
  if (!datos || !datos.porContratista || datos.porContratista.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles para mostrar
        </Typography>
      </Paper>
    );
  }

  // Limitar a 5 contratistas para mejor visualización
  const datosLimitados = datos.porContratista.slice(0, 5);
  
  // Colores según tema
  const secondaryColor = theme.palette.secondary.main || '#82ca9d';

  // Función para acortar nombres de contratistas muy largos
  const acortarNombre = (nombre, maxLength = 25) => {
    if (!nombre) return '';
    if (nombre.length <= maxLength) return nombre;
    return nombre.substring(0, maxLength) + '...';
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Cumplimiento por contratista (%)
      </Typography>
      
      <Box sx={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datosLimitados}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              label={{ 
                value: '% Cumplimiento', 
                position: 'insideBottom',
                offset: -15
              }}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={150}
              tick={{ fontSize: 12 }}
              tickFormatter={acortarNombre}
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Cumplimiento']}
            />
            <Legend />
            
            {/* Líneas de referencia para niveles de cumplimiento */}
            <ReferenceLine x={80} label="Bueno" stroke="green" strokeDasharray="3 3" />
            <ReferenceLine x={60} label="Regular" stroke="orange" strokeDasharray="3 3" />
            
            <Bar 
              dataKey="promedio" 
              fill={secondaryColor}
              name="% Cumplimiento"
              barSize={20}
              label={{ 
                position: 'right', 
                formatter: (value) => `${value}%`,
                fill: '#000000'
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      
      {datos.porContratista.length > 5 && (
        <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
          Mostrando los 5 contratistas con mayor cumplimiento de {datos.porContratista.length} totales
        </Typography>
      )}
    </Paper>
  );
};

export default ContratistasChart;