import React, { useState } from 'react';
import { 
  Box, 
  Collapse, 
  IconButton, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography, 
  Paper,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AssignmentIcon from '@mui/icons-material/Assignment';

// Componente interno para manejar el estado de cada fila de forma independiente
const Row = ({ form }) => {
  const [open, setOpen] = useState(false);

  // Determinar el color del chip según el porcentaje de cumplimiento
  const getCumplimientoColor = (porcentaje) => {
    if (porcentaje >= 80) return 'success';
    if (porcentaje >= 60) return 'warning';
    return 'error';
  };

  // Formatear el tipo de espacio para que sea más legible
  const getTipoEspacioText = (tipo) => {
    if (tipo === 'cdvfijo') return 'CDV Fijo';
    if (tipo === 'cdvparque') return 'Parque / EC';
    return tipo || 'N/A';
  };

  const cumplimiento = Number(form.porcentajeCumplimiento) || 0;
  const observaciones = form.generalObservations || form.observacionesGenerales || null;

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {form.fechaVisita || 'N/A'}
        </TableCell>
        <TableCell>{form.espacioAtencion || 'N/A'} ({getTipoEspacioText(form.tipoEspacio)})</TableCell>
        <TableCell>{form.contratista || 'N/A'}</TableCell>
        <TableCell>{form.apoyoSupervision || 'N/A'}</TableCell>
        <TableCell align="center">
          <Chip 
            label={`${cumplimiento}%`} 
            color={getCumplimientoColor(cumplimiento)} 
            size="small" 
            sx={{ fontWeight: 'bold', minWidth: '60px' }}
          />
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', color: '#1976d2' }}>
                <AssignmentIcon sx={{ mr: 1, fontSize: 20 }} />
                Detalle y Observaciones
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                {/* Columna Izquierda: Observaciones Cualitativas */}
                <Grid item xs={12} md={7}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Observaciones Generales de Campo:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: observaciones ? 'textPrimary' : 'textSecondary', fontStyle: observaciones ? 'normal' : 'italic' }}>
                    {observaciones ? observaciones : "No se registraron observaciones adicionales para esta visita."}
                  </Typography>
                </Grid>

                {/* Columna Derecha: Desglose Cuantitativo */}
                <Grid item xs={12} md={5}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Puntaje por Componente:
                  </Typography>
                  <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1, border: '1px solid #eeeeee' }}>
                    {form.puntajePorComponente && Object.keys(form.puntajePorComponente).length > 0 ? (
                      Object.entries(form.puntajePorComponente).map(([key, data]) => (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {key.replace('COMPONENTE', '').toLowerCase()}:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {data.total || 0} / {data.maxPuntos || 0} pts
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="textSecondary" fontStyle="italic">
                        Desglose no disponible en este registro.
                      </Typography>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="bold">Total Visita:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {form.puntajeTotal || 0} pts
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const BitacoraObservaciones = ({ formularios }) => {
  if (!formularios || formularios.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles para mostrar en la bitácora.
        </Typography>
      </Paper>
    );
  }

  // Ordenar formularios por fecha (los más recientes primero)
  const formulariosOrdenados = [...formularios].sort((a, b) => {
    return new Date(b.fechaVisita) - new Date(a.fechaVisita);
  });

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
      <Table stickyHeader aria-label="bitacora de observaciones">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '50px', bgcolor: '#f5f5f5' }} />
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Fecha</TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Espacio / Tipo</TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Contratista</TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Apoyo Supervisión</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Cumplimiento</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {formulariosOrdenados.map((form, index) => (
            <Row key={form.id || index} form={form} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BitacoraObservaciones;