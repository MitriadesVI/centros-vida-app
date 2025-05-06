import React, { useState } from 'react';
import { 
  Paper, Typography, Box, Grid, Button, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Dialog, DialogTitle, 
  DialogContent, DialogActions
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';

const ComponenteDetailView = ({ componente, datos, onClose }) => {
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  
  // Determinar datos a mostrar basado en el componente seleccionado
  const componenteData = datos?.porComponenteDetallado?.[componente];
  
  if (!componenteData) {
    return (
      <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Detalle del Componente {getTitulo(componente)}</DialogTitle>
        <DialogContent>
          <Typography align="center" color="textSecondary">
            No hay datos disponibles para este componente
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  // Organizar datos por ítem para los gráficos
  const itemsData = [];
  const idsVistos = new Set();
  
  // Agrupar por ID para evitar duplicados
  componenteData.items.forEach(item => {
    if (!idsVistos.has(item.id)) {
      idsVistos.add(item.id);
      
      // Calcular promedio si hay múltiples entradas para el mismo ítem
      const todasEntradas = componenteData.items.filter(i => i.id === item.id);
      const totalValor = todasEntradas.reduce((sum, i) => sum + i.valor, 0);
      const promedio = todasEntradas.length > 0 ? Math.round(totalValor / todasEntradas.length) : 0;
      
      itemsData.push({
        id: item.id,
        label: item.label,
        promedio: promedio,
        valorMaximo: item.valorMaximo,
        entradas: todasEntradas.length
      });
    }
  });
  
  // Ordenar por ID o número
  itemsData.sort((a, b) => a.id.localeCompare(b.id));
  
  // Manejar selección de ítem para ver detalles
  const handleItemClick = (item) => {
    setItemSeleccionado(item);
  };
  
  // Obtener título formateado
  function getTitulo(comp) {
    switch(comp) {
      case 'tecnico': return 'Técnico';
      case 'nutricion': return 'Nutrición y Alimentación';
      case 'infraestructura': return 'Infraestructura y Dotación';
      default: return comp;
    }
  }
  
  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Detalle del Componente {getTitulo(componente)}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Tarjetas de resumen */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>Puntuación</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {componenteData.puntosTotales}/{componenteData.puntosMaximos}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                puntos acumulados
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>Porcentaje</Typography>
              <Typography 
                variant="h4" 
                fontWeight="bold" 
                sx={{ 
                  color: componenteData.porcentaje >= 80 ? '#2e7d32' : 
                         componenteData.porcentaje >= 60 ? '#ed6c02' : '#d32f2f' 
                }}
              >
                {componenteData.porcentaje}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                cumplimiento
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>Ítems Evaluados</Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {idsVistos.size}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ítems únicos
              </Typography>
            </Paper>
          </Grid>
          
          {/* Gráfico de barras por ítem */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Cumplimiento por Ítem (%)
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={itemsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="id" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      interval={0}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value, name, props) => [`${value}%`, 'Promedio']}
                      labelFormatter={(value) => `Ítem: ${value}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="promedio" 
                      name="Cumplimiento %" 
                      onClick={handleItemClick}
                      cursor="pointer"
                    >
                      {itemsData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.promedio >= 80 ? '#4caf50' : 
                                entry.promedio >= 60 ? '#ff9800' : '#f44336'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }}>
                Haz clic en una barra para ver más detalles del ítem
              </Typography>
            </Paper>
          </Grid>
          
          {/* Tabla de ítems */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Promedio</TableCell>
                    <TableCell align="right">Evaluaciones</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemsData.map((item) => (
                    <TableRow 
                      key={item.id}
                      hover
                      onClick={() => handleItemClick(item)}
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: item.id === itemSeleccionado?.id ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                      }}
                    >
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.label}</TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: item.promedio >= 80 ? '#2e7d32' : 
                                 item.promedio >= 60 ? '#ed6c02' : '#d32f2f',
                          fontWeight: 'bold'
                        }}
                      >
                        {item.promedio}%
                      </TableCell>
                      <TableCell align="right">{item.entradas}</TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                        >
                          Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
        
        {/* Diálogo para detalles del ítem */}
        {itemSeleccionado && (
          <Dialog 
            open={!!itemSeleccionado} 
            onClose={() => setItemSeleccionado(null)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Detalle del Ítem {itemSeleccionado.id}
            </DialogTitle>
            <DialogContent>
              <Typography variant="subtitle1" gutterBottom>
                {itemSeleccionado.label}
              </Typography>
              <Typography variant="body1" paragraph>
                Cumplimiento promedio: <strong>{itemSeleccionado.promedio}%</strong>
              </Typography>
              <Typography variant="body1" paragraph>
                Evaluado en {itemSeleccionado.entradas} formularios
              </Typography>
              
              {/* Aquí se podría agregar un historial de evaluaciones si se tiene esa información */}
              
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setItemSeleccionado(null)}>Cerrar</Button>
            </DialogActions>
          </Dialog>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComponenteDetailView;