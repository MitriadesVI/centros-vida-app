import React, { useMemo } from 'react';
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
  Chip,
  Avatar,
  Card,
  CardHeader,
  Tooltip,
  IconButton
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonIcon from '@mui/icons-material/Person';

const EscalafonSupervisionComponent = ({ datos }) => {
  // Procesar datos para el escalafón
  const escalafon = useMemo(() => {
    if (!datos || !datos.formularios || datos.formularios.length === 0) {
      return [];
    }
    
    // Agrupar por nombre de apoyo a la supervisión
    const agrupados = {};
    
    datos.formularios.forEach(form => {
      const apoyoSup = form.apoyoSupervision || 'No especificado';
      
      if (!agrupados[apoyoSup]) {
        agrupados[apoyoSup] = {
          nombre: apoyoSup,
          totalVisitas: 0,
          sumaCumplimiento: 0,
          visitas: {
            cdvfijo: 0,
            cdvparque: 0
          },
          formularios: []
        };
      }
      
      // Sumar visitas y acumular cumplimiento
      agrupados[apoyoSup].totalVisitas += 1;
      agrupados[apoyoSup].sumaCumplimiento += (form.porcentajeCumplimiento || 0);
      
      // Contar por tipo de espacio
      if (form.tipoEspacio === 'cdvfijo') {
        agrupados[apoyoSup].visitas.cdvfijo += 1;
      } else if (form.tipoEspacio === 'cdvparque') {
        agrupados[apoyoSup].visitas.cdvparque += 1;
      }
      
      // Guardar formulario para referencias posteriores
      agrupados[apoyoSup].formularios.push(form);
    });
    
    // Convertir a array y calcular promedios
    const resultado = Object.values(agrupados).map(apoyo => ({
      ...apoyo,
      promedioCumplimiento: Math.round(apoyo.sumaCumplimiento / apoyo.totalVisitas)
    }));
    
    // Ordenar por número de visitas (descendente)
    return resultado.sort((a, b) => b.totalVisitas - a.totalVisitas);
  }, [datos]);
  
  // Obtener color por valor
  const getColorByValue = (value) => {
    if (value < 60) return 'error';
    if (value < 80) return 'warning';
    return 'success';
  };
  
  // Exportar a CSV
  const exportarCSV = () => {
    if (escalafon.length === 0) return;
    
    // Crear cabeceras
    const cabeceras = [
      'Apoyo a la Supervisión', 'Total Visitas', '% Promedio', 'Centros Fijos', 'Espacios Comunitarios'
    ].join(',');
    
    // Crear filas
    const filas = escalafon.map(item => [
      `"${item.nombre.replace(/"/g, '""')}"`, // Escapar comillas
      item.totalVisitas,
      `${item.promedioCumplimiento}%`,
      item.visitas.cdvfijo,
      item.visitas.cdvparque
    ].join(',')).join('\n');
    
    // Combinar todo
    const csvContent = `${cabeceras}\n${filas}`;
    
    // Crear blob y enlace para descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Escalafon_Supervision_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Función para generar las iniciales
  const getInitials = (name) => {
    if (!name || name === 'No especificado') return 'N/A';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Color aleatorio pero consistente para cada nombre
  const getColorForName = (name) => {
    const colors = [
      '#1976d2', '#2e7d32', '#c62828', '#7b1fa2', 
      '#0097a7', '#ff5722', '#6d4c41', '#f57c00'
    ];
    
    if (!name || name === 'No especificado') return '#757575';
    
    // Hash simple para seleccionar un color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convertir hash a índice dentro del array de colores
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };
  
  return (
    <Card variant="outlined">
      <CardHeader
       title="Supervisores por Desempeño"
         subheader="Detalle de visitas realizadas por cada apoyo a la supervisión"
         action={
          <Tooltip title="Exportar a CSV">
            <IconButton onClick={exportarCSV} disabled={escalafon.length === 0}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        }
      />
      
      <TableContainer component={Box} sx={{ px: 2, pb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Supervisor</TableCell>
              <TableCell align="center">Visitas Realizadas</TableCell>
              <TableCell align="center">Cumplimiento Promedio</TableCell>
              <TableCell align="center">Centros Fijos</TableCell>
              <TableCell align="center">Parques/Espacios Comunitarios</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {escalafon.length > 0 ? (
              escalafon.map((item, index) => (
                <TableRow 
                  key={index}
                  sx={{ 
                    '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.05)' }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        sx={{ 
                          width: 30, 
                          height: 30, 
                          bgcolor: getColorForName(item.nombre),
                          mr: 1,
                          fontSize: '0.8rem'
                        }}
                      >
                        {getInitials(item.nombre)}
                      </Avatar>
                      <Typography variant="body2">
                        {item.nombre}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold">
                      {item.totalVisitas}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={`${item.promedioCumplimiento}%`}
                      color={getColorByValue(item.promedioCumplimiento)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {item.visitas.cdvfijo}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {item.visitas.cdvparque}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Box sx={{ py: 3 }}>
                    <PersonIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No hay datos de supervisores disponibles
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default EscalafonSupervisionComponent;