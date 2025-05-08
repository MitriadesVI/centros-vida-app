import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Paper, Typography, Box, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

const ContratistasChart = ({ datos }) => {
  // Verificar si hay datos
  if (!datos || !datos.porContratista || datos.porContratista.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles sobre contratistas
        </Typography>
      </Paper>
    );
  }

  // Ordenar contratistas por cumplimiento (mayor a menor)
  const datosContratistas = [...datos.porContratista].sort((a, b) => b.promedio - a.promedio);

  // Función para asignar color según el nombre del contratista
  const getBarColor = (nombre) => {
    if (nombre.includes('CUC')) return '#E53935'; // Rojo para CUC
    if (nombre.includes('FUNDACARIBE')) return '#1976D2'; // Azul para FUNDACARIBE
    return '#9C27B0'; // Color morado para otros contratistas (si hubiera)
  };

  // Asignar colores a los datos
  const datosConColores = datosContratistas.map(contratista => ({
    ...contratista,
    color: getBarColor(contratista.name)
  }));

  // Formatear tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, bgcolor: 'background.paper', boxShadow: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {payload[0].payload.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: payload[0].payload.color, mr: 1, borderRadius: '50%' }} />
            <Typography variant="body2">
              Cumplimiento: <strong>{payload[0].value}%</strong>
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {payload[0].payload.visitas} visitas totales
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Simplificar nombres de contratistas para mostrar en el eje X
  const simplificarNombre = (nombre) => {
    if (nombre.includes('CUC')) return 'CUC';
    if (nombre.includes('FUNDACARIBE')) return 'FUNDACARIBE';
    return nombre;
  };

  // Datos simplificados para el gráfico
  const datosGrafico = datosContratistas.map(contratista => ({
    ...contratista,
    nombreCorto: simplificarNombre(contratista.name),
    color: getBarColor(contratista.name)
  }));

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Cumplimiento por Contratista
      </Typography>

      <Box sx={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datosGrafico}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="nombreCorto" 
              tick={{ fontSize: 12 }}
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
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={60} stroke="orange" label={{ value: "Regular", position: "insideRight" }} />
            <ReferenceLine y={80} stroke="green" label={{ value: "Bueno", position: "insideRight" }} />
            <Legend />
            <Bar 
              dataKey="promedio" 
              name="% Cumplimiento" 
              // Usar el color personalizado para cada barra
              fill="#8884d8"
              shape={(props) => {
                const { fill, x, y, width, height, payload } = props;
                return <rect x={x} y={y} width={width} height={height} fill={payload.color} stroke="none" />;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Tabla complementaria */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Contratista</TableCell>
              <TableCell align="center">Visitas</TableCell>
              <TableCell align="center">Cumplimiento</TableCell>
              <TableCell align="center">PM (promedio)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datosContratistas.map((contratista) => (
              <TableRow key={contratista.name}>
                <TableCell>{contratista.name}</TableCell>
                <TableCell align="center">{contratista.visitas}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={`${contratista.promedio}%`}
                    size="small"
                    sx={{ bgcolor: getBarColor(contratista.name), color: 'white' }}
                  />
                </TableCell>
                <TableCell align="center">{contratista.pmAsistentes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ContratistasChart;