import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TextField,
  Button,
  Toolbar,
  IconButton,
  Tooltip,
  TablePagination
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BarChartIcon from '@mui/icons-material/BarChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const EspaciosVisitadosChart = ({ datos }) => {
  const [espaciosData, setEspaciosData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [view, setView] = useState('table'); // 'table' o 'chart'

  useEffect(() => {
    if (datos && datos.formularios && datos.formularios.length > 0) {
      // Agrupar por espacio de atención
      const espaciosMap = new Map();
      
      datos.formularios.forEach(form => {
        if (form.espacioAtencion) {
          const espacioKey = form.espacioAtencion.toLowerCase();
          if (espaciosMap.has(espacioKey)) {
            const espacioData = espaciosMap.get(espacioKey);
            espacioData.count += 1;
            espacioData.pmTotal += Number(form.pmAsistentes || 0);
            
            // Actualizar últimas fechas de visita
            espacioData.lastVisitDate = 
              new Date(form.fechaVisita) > new Date(espacioData.lastVisitDate)
                ? form.fechaVisita 
                : espacioData.lastVisitDate;
                
            // Calcular promedio de cumplimiento
            espacioData.totalCumplimiento += Number(form.porcentajeCumplimiento || 0);
            espacioData.cumplimientoPromedio = Math.round(espacioData.totalCumplimiento / espacioData.count);
            
            // Recordar el tipo de espacio
            espacioData.tipoEspacio = form.tipoEspacio;
            
            espaciosMap.set(espacioKey, espacioData);
          } else {
            espaciosMap.set(espacioKey, {
              nombre: form.espacioAtencion,
              count: 1,
              pmTotal: Number(form.pmAsistentes || 0),
              lastVisitDate: form.fechaVisita,
              tipoEspacio: form.tipoEspacio,
              totalCumplimiento: Number(form.porcentajeCumplimiento || 0),
              cumplimientoPromedio: Number(form.porcentajeCumplimiento || 0)
            });
          }
        }
      });
      
      // Convertir a array y ordenar por número de visitas (descendente)
      const espaciosArray = Array.from(espaciosMap.values())
        .map(item => ({
          ...item,
          pmPromedio: Math.round(item.pmTotal / item.count),
          tipoEspacioDisplay: item.tipoEspacio === 'cdvfijo' 
            ? 'Centro de Vida Fijo' 
            : item.tipoEspacio === 'cdvparque'
              ? 'Centro de Vida Parque/EC'
              : 'No especificado'
        }))
        .sort((a, b) => b.count - a.count);
      
      setEspaciosData(espaciosArray);
    }
  }, [datos]);

  // Filtrar espacios según el término de búsqueda
  const filteredEspacios = espaciosData.filter(espacio => 
    espacio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    espacio.tipoEspacioDisplay.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Funciones para paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Exportar a Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(espaciosData.map(item => ({
      'Espacio de Atención': item.nombre,
      'Tipo de Espacio': item.tipoEspacioDisplay,
      'Cantidad de Visitas': item.count,
      'Última Visita': item.lastVisitDate,
      'PM Total': item.pmTotal,
      'PM Promedio': item.pmPromedio,
      'Cumplimiento Promedio': item.cumplimientoPromedio + '%'
    })));
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 35 }, // Espacio de Atención
      { wch: 25 }, // Tipo de Espacio
      { wch: 15 }, // Cantidad de Visitas
      { wch: 15 }, // Última Visita
      { wch: 10 }, // PM Total
      { wch: 12 }, // PM Promedio
      { wch: 20 }  // Cumplimiento Promedio
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Espacios Visitados");
    
    // Generar el archivo Excel
    XLSX.writeFile(workbook, `Reporte_Espacios_Visitados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Datos para el gráfico de barras (solo los 15 más visitados)
  const chartData = [...espaciosData]
    .slice(0, 15)
    .map(item => ({
      name: item.nombre.length > 20 ? `${item.nombre.substring(0, 20)}...` : item.nombre,
      visitas: item.count,
      tipo: item.tipoEspacioDisplay,
      cumplimiento: item.cumplimientoPromedio
    }));

  // Si no hay datos
  if (espaciosData.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Espacios Visitados</Typography>
        <Typography variant="body1" color="textSecondary" align="center" sx={{ my: 3 }}>
          No hay datos disponibles para analizar.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Espacios Visitados</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Cambiar vista">
            <IconButton 
              onClick={() => setView(view === 'table' ? 'chart' : 'table')}
              color="primary"
            >
              <BarChartIcon />
            </IconButton>
          </Tooltip>
          
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />} 
            size="small"
            onClick={exportToExcel}
          >
            Exportar a Excel
          </Button>
        </Box>
      </Box>
      
      <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
        <TextField
          margin="dense"
          id="buscar"
          label="Buscar espacios"
          type="search"
          fullWidth
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0); // Volver a la primera página al buscar
          }}
          sx={{ maxWidth: 400 }}
        />
      </Toolbar>
      
      {view === 'table' ? (
        <>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Espacio de Atención</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Visitas</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Última Visita</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>PM Promedio</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Cumplimiento</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEspacios
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((espacio, index) => (
                    <TableRow 
                      key={index}
                      hover
                      sx={{
                        '&:nth-of-type(even)': { backgroundColor: '#f5f5f5' },
                        '& > td': { fontSize: '0.875rem' }
                      }}
                    >
                      <TableCell>{espacio.nombre}</TableCell>
                      <TableCell>{espacio.tipoEspacioDisplay}</TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>{espacio.count}</TableCell>
                      <TableCell>{espacio.lastVisitDate}</TableCell>
                      <TableCell>{espacio.pmPromedio}</TableCell>
                      <TableCell>
                        <Box sx={{ 
                          bgcolor: espacio.cumplimientoPromedio >= 80 ? '#e8f5e9' : 
                                  espacio.cumplimientoPromedio >= 60 ? '#fff8e1' : '#ffebee',
                          p: 0.5,
                          borderRadius: 1,
                          textAlign: 'center'
                        }}>
                          {espacio.cumplimientoPromedio}%
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredEspacios.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </>
      ) : (
        <Box sx={{ height: 400, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 120 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <RechartsTooltip 
                formatter={(value, name, props) => {
                  if (name === 'visitas') return [`${value} visitas`, 'Visitas'];
                  if (name === 'cumplimiento') return [`${value}%`, 'Cumplimiento'];
                  return [value, name];
                }}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label);
                  return [item?.name, item?.tipo];
                }}
              />
              <Legend />
              <Bar dataKey="visitas" name="Visitas" fill="#1976d2" />
              <Bar dataKey="cumplimiento" name="Cumplimiento %" fill="#4caf50" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
      
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontStyle: 'italic' }}>
        Total de espacios de atención: {espaciosData.length}
      </Typography>
    </Paper>
  );
};

export default EspaciosVisitadosChart;