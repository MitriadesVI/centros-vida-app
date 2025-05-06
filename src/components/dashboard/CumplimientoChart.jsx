import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';

const CumplimientoChart = ({ datos }) => {
  const theme = useTheme();
  
  // Si no hay datos, mostrar mensaje
  if (!datos || !datos.porFecha || datos.porFecha.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles para mostrar
        </Typography>
      </Paper>
    );
  }

  // Función para formatear fechas en el gráfico
  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    
    try {
      const partes = fecha.split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}`;
      }
      return fecha;
    } catch (e) {
      return fecha;
    }
  };

  // Colores según tema
  const primaryColor = theme.palette.primary.main || '#1976d2';

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Cumplimiento por día (%)
      </Typography>
      
      <Box sx={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={datos.porFecha}
            margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fecha" 
              tickFormatter={formatearFecha}
              angle={-45}
              textAnchor="end"
              height={50}
              interval={0}
            />
            <YAxis 
              domain={[0, 100]} 
              label={{ 
                value: '% Cumplimiento', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }} 
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Cumplimiento']}
              labelFormatter={(fecha) => `Fecha: ${fecha}`}
            />
            <Legend />
            
            {/* Líneas de referencia para niveles de cumplimiento */}
            <ReferenceLine y={80} label="Bueno" stroke="green" strokeDasharray="3 3" />
            <ReferenceLine y={60} label="Regular" stroke="orange" strokeDasharray="3 3" />
            
            <Line
              type="monotone"
              dataKey="promedio"
              stroke={primaryColor}
              name="% Cumplimiento"
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ fill: primaryColor, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      
      {datos.porFecha.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Mostrando {datos.porFecha.length} día(s) • Promedio general: {datos.promedioCumplimiento}%
        </Typography>
      )}
    </Paper>
  );
};

export default CumplimientoChart;