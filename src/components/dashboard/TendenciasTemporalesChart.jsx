import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Paper, Typography, Box, useTheme, ToggleButtonGroup, ToggleButton } from '@mui/material';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';

const TendenciasTemporalesChart = ({ datos }) => {
  const theme = useTheme();
  const [agrupacion, setAgrupacion] = React.useState('semana');
  
  // Función para formatear fechas
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

  // Cambiar tipo de agrupación
  const handleAgrupacionChange = (event, newValue) => {
    if (newValue !== null) {
      setAgrupacion(newValue);
    }
  };
  
  // Procesar datos para tendencias temporales
  const datosProcesados = useMemo(() => {
    if (!datos || !datos.formularios || datos.formularios.length === 0) {
      return [];
    }
    
    // Hacer una copia de los formularios para no modificar el original
    const formulariosCopy = [...datos.formularios];
    
    // Ordenar por fecha
    formulariosCopy.sort((a, b) => {
      if (!a.fechaVisita) return 1;
      if (!b.fechaVisita) return -1;
      return new Date(a.fechaVisita) - new Date(b.fechaVisita);
    });
    
    // Agrupar por periodos (semana o mes)
    const periodos = {};
    
    formulariosCopy.forEach(form => {
      if (!form.fechaVisita) return;
      
      // Crear una fecha a partir de la cadena
      const fecha = new Date(form.fechaVisita);
      
      // Determinar período según la agrupación
      let periodoKey;
      let periodoLabel;
      
      if (agrupacion === 'semana') {
        // Obtener el inicio de semana (lunes)
        const inicioSemana = new Date(fecha);
        const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const diffInicio = diaSemana === 0 ? 6 : diaSemana - 1; // Ajuste para que semana empiece en lunes
        inicioSemana.setDate(fecha.getDate() - diffInicio);
        
        // Obtener el fin de semana (domingo)
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        
        periodoKey = inicioSemana.toISOString().split('T')[0];
        periodoLabel = `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1} - ${finSemana.getDate()}/${finSemana.getMonth() + 1}`;
      } else {
        // Agrupar por mes
        periodoKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        periodoLabel = `${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][fecha.getMonth()]} ${fecha.getFullYear()}`;
      }
      
      // Inicializar el periodo si no existe
      if (!periodos[periodoKey]) {
        periodos[periodoKey] = {
          fecha: periodoKey,
          label: periodoLabel,
          formularios: {
            total: [],
            cdvfijo: [],
            cdvparque: []
          }
        };
      }
      
      // Agregar formulario al total
      periodos[periodoKey].formularios.total.push(form);
      
      // Agregar formulario por tipo
      if (form.tipoEspacio === 'cdvfijo') {
        periodos[periodoKey].formularios.cdvfijo.push(form);
      } else if (form.tipoEspacio === 'cdvparque') {
        periodos[periodoKey].formularios.cdvparque.push(form);
      }
    });
    
    // Calcular promedios para cada periodo
    const resultado = Object.values(periodos).map(periodo => {
      // Calcular promedio general
      const promedioTotal = periodo.formularios.total.length > 0 
        ? Math.round(periodo.formularios.total.reduce((sum, form) => sum + (form.porcentajeCumplimiento || 0), 0) / periodo.formularios.total.length) 
        : 0;
      
      // Calcular promedio para cdvfijo
      const promedioCDVFijo = periodo.formularios.cdvfijo.length > 0 
        ? Math.round(periodo.formularios.cdvfijo.reduce((sum, form) => sum + (form.porcentajeCumplimiento || 0), 0) / periodo.formularios.cdvfijo.length) 
        : null;
      
      // Calcular promedio para cdvparque
      const promedioCDVParque = periodo.formularios.cdvparque.length > 0 
        ? Math.round(periodo.formularios.cdvparque.reduce((sum, form) => sum + (form.porcentajeCumplimiento || 0), 0) / periodo.formularios.cdvparque.length) 
        : null;
      
      return {
        name: periodo.label,
        fecha: periodo.fecha,
        total: promedioTotal,
        cdvfijo: promedioCDVFijo,
        cdvparque: promedioCDVParque,
        cantidadTotal: periodo.formularios.total.length,
        cantidadFijo: periodo.formularios.cdvfijo.length,
        cantidadParque: periodo.formularios.cdvparque.length
      };
    });
    
    // Limitar a los últimos 12 periodos si hay más
    return resultado.slice(-12);
  }, [datos, agrupacion]);
  
  // Si no hay datos, mostrar mensaje
  if (!datos || !datos.formularios || datos.formularios.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No hay datos disponibles para mostrar tendencias temporales
        </Typography>
      </Paper>
    );
  }

  // Personalizar tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.95)', boxShadow: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {label}
          </Typography>
          
          {payload.map((entry, index) => {
            // Solo mostrar líneas con datos
            if (entry.value === null) return null;
            
            let nombre = '';
            let cantidad = 0;
            
            if (entry.dataKey === 'total') {
              nombre = 'Promedio General';
              cantidad = payload[0].payload.cantidadTotal;
            } else if (entry.dataKey === 'cdvfijo') {
              nombre = 'Centro de Vida Fijo';
              cantidad = payload[0].payload.cantidadFijo;
            } else if (entry.dataKey === 'cdvparque') {
              nombre = 'Parques/Espacios Comunitarios';
              cantidad = payload[0].payload.cantidadParque;
            }
            
            return (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: entry.color,
                    mr: 1,
                    borderRadius: '50%'
                  }}
                />
                <Typography variant="body2">
                  {nombre}: <strong>{entry.value}%</strong> ({cantidad} visitas)
                </Typography>
              </Box>
            );
          })}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Tendencia de Cumplimiento por Modalidad
        </Typography>
        
        <ToggleButtonGroup
          value={agrupacion}
          exclusive
          onChange={handleAgrupacionChange}
          size="small"
        >
          <ToggleButton value="semana">
            <CalendarViewWeekIcon fontSize="small" sx={{ mr: 1 }} />
            Semanal
          </ToggleButton>
          <ToggleButton value="mes">
            <CalendarViewMonthIcon fontSize="small" sx={{ mr: 1 }} />
            Mensual
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ height: 350, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={datosProcesados}
            margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end"
              height={70}
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
            <Legend wrapperStyle={{ paddingTop: 15 }} />
            
            {/* Líneas de referencia */}
            <ReferenceLine y={80} label="Bueno" stroke="green" strokeDasharray="3 3" />
            <ReferenceLine y={60} label="Regular" stroke="orange" strokeDasharray="3 3" />
            
            {/* Línea para total */}
            <Line
              type="monotone"
              dataKey="total"
              name="Promedio General"
              stroke={theme.palette.info.main}
              strokeWidth={2.5}
              dot={{ fill: theme.palette.info.main, strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8 }}
            />
            
            {/* Línea para Centro de Vida Fijo */}
            <Line
              type="monotone"
              dataKey="cdvfijo"
              name="Centro de Vida Fijo"
              stroke={theme.palette.primary.main}
              strokeWidth={1.5}
              dot={{ fill: theme.palette.primary.main }}
              connectNulls={true}
            />
            
            {/* Línea para Espacio Comunitario */}
            <Line
              type="monotone"
              dataKey="cdvparque"
              name="Parques/Espacios Comunitarios"
              stroke={theme.palette.secondary.main}
              strokeWidth={1.5}
              dot={{ fill: theme.palette.secondary.main }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
        Mostrando tendencia de cumplimiento para los últimos {datosProcesados.length} períodos
      </Typography>
    </Paper>
  );
};

export default TendenciasTemporalesChart;