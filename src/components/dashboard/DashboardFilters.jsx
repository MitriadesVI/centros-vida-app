import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField, Button, Grid, Paper } from '@mui/material';
import { getContratistasUnicos } from '../../services/dashboardService';

const DashboardFilters = ({ onFilterChange, initialFilters }) => {
  const [filtros, setFiltros] = useState(initialFilters || {
    fechaInicio: '',
    fechaFin: '',
    tipoEspacio: 'todos',
    contratista: 'todos'
  });
  
  const [contratistas, setContratistas] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  // Cargar lista de contratistas al montar el componente
  useEffect(() => {
    const cargarContratistas = async () => {
      try {
        setCargando(true);
        const listaContratistas = await getContratistasUnicos();
        setContratistas(listaContratistas);
      } catch (error) {
        console.error('Error al cargar contratistas:', error);
      } finally {
        setCargando(false);
      }
    };
    
    cargarContratistas();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const aplicarFiltros = () => {
    console.log("Aplicando filtros:", filtros);
    onFilterChange(filtros);
  };
  
  const limpiarFiltros = () => {
    const filtrosLimpios = {
      fechaInicio: '',
      fechaFin: '',
      tipoEspacio: 'todos',
      contratista: 'todos'
    };
    
    setFiltros(filtrosLimpios);
    onFilterChange(filtrosLimpios);
  };
  
  return (
    <Paper sx={{ mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Fecha Inicio"
            type="date"
            name="fechaInicio"
            value={filtros.fechaInicio}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: filtros.fechaFin || undefined }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Fecha Fin"
            type="date"
            name="fechaFin"
            value={filtros.fechaFin}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: filtros.fechaInicio || undefined }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Espacio</InputLabel>
            <Select
              name="tipoEspacio"
              value={filtros.tipoEspacio}
              onChange={handleChange}
              label="Tipo de Espacio"
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="cdvfijo">Centro de Vida Fijo</MenuItem>
              <MenuItem value="cdvparque">Centro de Vida Parque/Espacio Comunitario</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Contratista</InputLabel>
            <Select
              name="contratista"
              value={filtros.contratista}
              onChange={handleChange}
              label="Contratista"
              disabled={cargando || contratistas.length === 0}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {contratistas.map((contratista) => (
                <MenuItem key={contratista} value={contratista}>
                  {contratista}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={aplicarFiltros}
              fullWidth
            >
              APLICAR
            </Button>
            <Button 
              variant="outlined" 
              onClick={limpiarFiltros}
            >
              LIMPIAR
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DashboardFilters;