import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Paper, Typography, Box, Grid, useTheme, Button } from '@mui/material';
import ComponenteDetailView from './ComponenteDetailView';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const EspaciosChart = ({ datos }) => {
  const theme = useTheme();
  const [componenteSeleccionado, setComponenteSeleccionado] = useState(null);
  
  // Si no hay datos, mostrar mensaje
  if (!datos || !datos.porTipoEspacio || datos.porTipoEspacio.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles para mostrar
        </Typography>
      </Paper>
    );
  }

  // Datos para el gráfico de componentes con valores absolutos y relativos
  const datosComponentes = [
    { 
      name: 'Técnico', 
      value: datos.porComponente.tecnico,
      puntosTotales: datos.porComponenteDetallado?.tecnico?.puntosTotales || 0,
      puntosMaximos: datos.porComponenteDetallado?.tecnico?.puntosMaximos || 0,
      key: 'tecnico'
    },
    { 
      name: 'Nutrición', 
      value: datos.porComponente.nutricion,
      puntosTotales: datos.porComponenteDetallado?.nutricion?.puntosTotales || 0, 
      puntosMaximos: datos.porComponenteDetallado?.nutricion?.puntosMaximos || 0,
      key: 'nutricion'
    },
    { 
      name: 'Infraestructura', 
      value: datos.porComponente.infraestructura,
      puntosTotales: datos.porComponenteDetallado?.infraestructura?.puntosTotales || 0,
      puntosMaximos: datos.porComponenteDetallado?.infraestructura?.puntosMaximos || 0,
      key: 'infraestructura'
    }
  ];

  // Personalizar el formato del tooltip
  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <Paper sx={{ p: 1, bgcolor: 'rgba(255, 255, 255, 0.9)', boxShadow: 1 }}>
          <Typography variant="subtitle2" color="textPrimary">
            {item.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Cumplimiento: {item.value}%
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Puntos: {item.puntosTotales}/{item.puntosMaximos}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Función para ver detalles del componente
  const verDetalleComponente = (componente) => {
    setComponenteSeleccionado(componente.key);
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Visitas por tipo de espacio
          </Typography>
          
          <Box sx={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datos.porTipoEspacio}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="visitas"
                >
                  {datos.porTipoEspacio.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Cumplimiento por componente (%)
          </Typography>
          
          <Box sx={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datosComponentes}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                onClick={(data) => data && verDetalleComponente(data.activePayload[0].payload)}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  domain={[0, 100]} 
                  label={{ 
                    value: '% Cumplimiento', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }} 
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const item = props.payload;
                    return [`${value}% (${item.puntosTotales}/${item.puntosMaximos} pts)`, 'Cumplimiento'];
                  }}
                />
                <Legend />
                
                {/* Líneas de referencia para niveles de cumplimiento */}
                <ReferenceLine y={80} label="Bueno" stroke="green" strokeDasharray="3 3" />
                <ReferenceLine y={60} label="Regular" stroke="orange" strokeDasharray="3 3" />
                
                <Bar 
                  dataKey="value" 
                  name="Cumplimiento" 
                  cursor="pointer"
                  label={{ 
                    position: 'top', 
                    formatter: (value) => `${value}%`
                  }}
                >
                  {datosComponentes.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value >= 80 ? '#4caf50' : 
                            entry.value >= 60 ? '#ff9800' : '#f44336'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
            {datosComponentes.map((comp) => (
              <Button 
                key={comp.key}
                size="small" 
                variant="outlined"
                onClick={() => verDetalleComponente(comp)}
                sx={{ 
                  borderColor: comp.value >= 80 ? '#4caf50' : 
                              comp.value >= 60 ? '#ff9800' : '#f44336',
                  color: comp.value >= 80 ? '#4caf50' : 
                         comp.value >= 60 ? '#ff9800' : '#f44336'
                }}
              >
                {comp.name} ({comp.puntosTotales}/{comp.puntosMaximos})
              </Button>
            ))}
          </Box>
        </Grid>
        
        {/* Texto instructivo */}
        <Grid item xs={12}>
          <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
            Haz clic en una barra o en los botones para ver detalles por componente
          </Typography>
        </Grid>
      </Grid>
      
      {/* Ventana modal para detalle de componente */}
      {componenteSeleccionado && (
        <ComponenteDetailView 
          componente={componenteSeleccionado} 
          datos={datos}
          onClose={() => setComponenteSeleccionado(null)}
        />
      )}
    </Paper>
  );
};

export default EspaciosChart;