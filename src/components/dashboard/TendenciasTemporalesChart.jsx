import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, BarChart, Bar 
} from 'recharts';
import { 
  Paper, Typography, Box, useTheme, ToggleButtonGroup, 
  ToggleButton, Chip, Divider, Grid 
} from '@mui/material';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import TimelineIcon from '@mui/icons-material/Timeline';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const TendenciasTemporalesChart = ({ datos }) => {
  const theme = useTheme();
  const [agrupacion, setAgrupacion] = useState('dia'); // Cambio: empezar con 'dia' para datos recientes
  const [vistaActiva, setVistaActiva] = useState('modalidad');
  const [datosGrafico, setDatosGrafico] = useState([]);

  // Colores para las líneas
  const colores = {
    general: theme.palette.grey[700],
    cdvfijo: theme.palette.primary.main,
    cdvparque: theme.palette.secondary.main,
    tecnico: '#2196F3',
    nutricion: '#4CAF50',
    infraestructura: '#FF9800'
  };

  // Procesar datos cuando cambien
  useEffect(() => {
    console.log("Datos recibidos en TendenciasTemporales:", datos);
    procesarDatos();
  }, [datos, agrupacion, vistaActiva]);

  const procesarDatos = () => {
    // Verificar que tenemos datos
    if (!datos || !datos.formularios || datos.formularios.length === 0) {
      console.log("No hay formularios para procesar");
      setDatosGrafico([]);
      return;
    }

    console.log("Procesando", datos.formularios.length, "formularios");

    // Agrupar por período
    const periodos = new Map();

    datos.formularios.forEach(form => {
      if (!form.fechaVisita) return;

      let periodoKey, periodoLabel;
      const fecha = new Date(form.fechaVisita);

      if (agrupacion === 'dia') {
        // Agrupar por día
        periodoKey = form.fechaVisita;
        periodoLabel = fecha.toLocaleDateString('es-CO', { 
          day: 'numeric', 
          month: 'short' 
        });
      } else if (agrupacion === 'semana') {
        // Agrupar por semana
        const inicioSemana = new Date(fecha);
        const dia = fecha.getDay();
        const diff = fecha.getDate() - dia + (dia === 0 ? -6 : 1);
        inicioSemana.setDate(diff);
        
        periodoKey = inicioSemana.toISOString().split('T')[0];
        periodoLabel = `Sem ${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1}`;
      } else {
        // Agrupar por mes
        periodoKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        periodoLabel = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      }

      if (!periodos.has(periodoKey)) {
        periodos.set(periodoKey, {
          key: periodoKey,
          label: periodoLabel,
          formularios: []
        });
      }

      periodos.get(periodoKey).formularios.push(form);
    });

    // Convertir a array y ordenar
    const periodosArray = Array.from(periodos.values())
      .sort((a, b) => a.key.localeCompare(b.key));

    console.log("Períodos agrupados:", periodosArray.length);

    // Procesar según vista
    let resultado = [];

    switch (vistaActiva) {
      case 'modalidad':
        resultado = procesarPorModalidad(periodosArray);
        break;
      case 'contratista':
        resultado = procesarPorContratista(periodosArray);
        break;
      case 'componente':
        resultado = procesarPorComponente(periodosArray);
        break;
    }

    console.log("Datos procesados para gráfico:", resultado);
    setDatosGrafico(resultado);
  };

  const procesarPorModalidad = (periodos) => {
    return periodos.map(periodo => {
      const resultado = {
        periodo: periodo.label,
        General: 0,
        'Centro Fijo': 0,
        'Parque/EC': 0,
        // Contadores para el cálculo
        totalGeneral: 0,
        countGeneral: 0,
        totalFijo: 0,
        countFijo: 0,
        totalParque: 0,
        countParque: 0
      };

      periodo.formularios.forEach(form => {
        const cumplimiento = Number(form.porcentajeCumplimiento) || 0;
        
        // Acumular para promedio general
        resultado.totalGeneral += cumplimiento;
        resultado.countGeneral++;

        // Acumular por tipo
        if (form.tipoEspacio === 'cdvfijo') {
          resultado.totalFijo += cumplimiento;
          resultado.countFijo++;
        } else if (form.tipoEspacio === 'cdvparque') {
          resultado.totalParque += cumplimiento;
          resultado.countParque++;
        }
      });

      // Calcular promedios
      resultado.General = resultado.countGeneral > 0 
        ? Math.round(resultado.totalGeneral / resultado.countGeneral) : null;
      resultado['Centro Fijo'] = resultado.countFijo > 0 
        ? Math.round(resultado.totalFijo / resultado.countFijo) : null;
      resultado['Parque/EC'] = resultado.countParque > 0 
        ? Math.round(resultado.totalParque / resultado.countParque) : null;

      // Limpiar campos auxiliares
      delete resultado.totalGeneral;
      delete resultado.countGeneral;
      delete resultado.totalFijo;
      delete resultado.countFijo;
      delete resultado.totalParque;
      delete resultado.countParque;

      return resultado;
    });
  };

  const procesarPorContratista = (periodos) => {
    // Obtener lista única de contratistas
    const contratistasSet = new Set();
    datos.formularios.forEach(form => {
      if (form.contratista) contratistasSet.add(form.contratista);
    });
    const contratistas = Array.from(contratistasSet).sort();

    return periodos.map(periodo => {
      const resultado = { periodo: periodo.label };

      // Inicializar contadores
      const contadores = {};
      contratistas.forEach(contratista => {
        contadores[contratista] = { total: 0, count: 0 };
      });

      // Acumular datos
      periodo.formularios.forEach(form => {
        if (form.contratista && contadores[form.contratista]) {
          contadores[form.contratista].total += Number(form.porcentajeCumplimiento) || 0;
          contadores[form.contratista].count++;
        }
      });

      // Calcular promedios
      contratistas.forEach(contratista => {
        const { total, count } = contadores[contratista];
        resultado[contratista] = count > 0 ? Math.round(total / count) : null;
      });

      return resultado;
    });
  };

  const procesarPorComponente = (periodos) => {
    return periodos.map(periodo => {
      const resultado = {
        periodo: periodo.label,
        'Técnico': null,
        'Nutrición': null,
        'Infraestructura': null
      };

      const contadores = {
        tecnico: { total: 0, count: 0 },
        nutricion: { total: 0, count: 0 },
        infraestructura: { total: 0, count: 0 }
      };

      periodo.formularios.forEach(form => {
        if (form.puntajePorComponente) {
          Object.entries(form.puntajePorComponente).forEach(([componente, datos]) => {
            const nombreLower = componente.toLowerCase();
            let tipo = null;
            
            if (nombreLower.includes('técnico') || nombreLower.includes('tecnico')) {
              tipo = 'tecnico';
            } else if (nombreLower.includes('nutrición') || nombreLower.includes('nutricion')) {
              tipo = 'nutricion';
            } else if (nombreLower.includes('infraestructura')) {
              tipo = 'infraestructura';
            }

            if (tipo && datos.porcentaje !== undefined) {
              contadores[tipo].total += Number(datos.porcentaje) || 0;
              contadores[tipo].count++;
            }
          });
        }
      });

      // Calcular promedios
      resultado['Técnico'] = contadores.tecnico.count > 0 
        ? Math.round(contadores.tecnico.total / contadores.tecnico.count) : null;
      resultado['Nutrición'] = contadores.nutricion.count > 0 
        ? Math.round(contadores.nutricion.total / contadores.nutricion.count) : null;
      resultado['Infraestructura'] = contadores.infraestructura.count > 0 
        ? Math.round(contadores.infraestructura.total / contadores.infraestructura.count) : null;

      return resultado;
    });
  };

  // Obtener las líneas a mostrar
  const obtenerLineas = () => {
    if (datosGrafico.length === 0) return [];

    const primeraFila = datosGrafico[0];
    const keys = Object.keys(primeraFila).filter(key => key !== 'periodo');

    if (vistaActiva === 'modalidad') {
      return [
        { dataKey: 'General', stroke: colores.general, strokeWidth: 3 },
        { dataKey: 'Centro Fijo', stroke: colores.cdvfijo, strokeWidth: 2 },
        { dataKey: 'Parque/EC', stroke: colores.cdvparque, strokeWidth: 2 }
      ];
    } else if (vistaActiva === 'componente') {
      return [
        { dataKey: 'Técnico', stroke: colores.tecnico, strokeWidth: 2 },
        { dataKey: 'Nutrición', stroke: colores.nutricion, strokeWidth: 2 },
        { dataKey: 'Infraestructura', stroke: colores.infraestructura, strokeWidth: 2 }
      ];
    } else {
      // Para contratistas
      const coloresDisponibles = ['#9C27B0', '#00BCD4', '#8BC34A', '#FF5722', '#795548', '#607D8B'];
      return keys.map((key, index) => ({
        dataKey: key,
        stroke: coloresDisponibles[index % coloresDisponibles.length],
        strokeWidth: 2
      }));
    }
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.95)' }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload
            .filter(entry => entry.value !== null)
            .map((entry, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    bgcolor: entry.color,
                    borderRadius: '50%',
                    mr: 1
                  }}
                />
                <Typography variant="body2">
                  {entry.name}: <strong>{entry.value}%</strong>
                </Typography>
              </Box>
            ))}
        </Paper>
      );
    }
    return null;
  };

  // Si no hay datos
  if (!datos || !datos.formularios || datos.formularios.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Análisis de Tendencias Temporales
        </Typography>
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="textSecondary">
            No hay datos disponibles para mostrar tendencias
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Determinar si usar gráfico de barras o líneas
  const usarBarras = datosGrafico.length <= 2;

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Análisis de Tendencias Temporales
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <ToggleButtonGroup
              value={vistaActiva}
              exclusive
              onChange={(e, newValue) => newValue && setVistaActiva(newValue)}
              size="small"
              fullWidth
            >
              <ToggleButton value="modalidad">Por Modalidad</ToggleButton>
              <ToggleButton value="contratista">Por Contratista</ToggleButton>
              <ToggleButton value="componente">Por Componente</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={6}>
            <ToggleButtonGroup
              value={agrupacion}
              exclusive
              onChange={(e, newValue) => newValue && setAgrupacion(newValue)}
              size="small"
              fullWidth
            >
              <ToggleButton value="dia">Diario</ToggleButton>
              <ToggleButton value="semana">
                <CalendarViewWeekIcon sx={{ mr: 1 }} />
                Semanal
              </ToggleButton>
              <ToggleButton value="mes">
                <CalendarViewMonthIcon sx={{ mr: 1 }} />
                Mensual
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Mostrar resumen */}
      {datosGrafico.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <ShowChartIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Mostrando {datosGrafico.length} {agrupacion === 'dia' ? 'días' : agrupacion === 'semana' ? 'semanas' : 'meses'} de datos
          </Typography>
        </Box>
      )}

      {/* Gráfico */}
      {datosGrafico.length > 0 ? (
        <Box sx={{ height: 400, width: '100%' }}>
          <ResponsiveContainer>
            {usarBarras ? (
              <BarChart data={datosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine y={80} stroke="green" strokeDasharray="5 5" />
                <ReferenceLine y={60} stroke="orange" strokeDasharray="5 5" />
                
                {obtenerLineas().map((linea, index) => (
                  <Bar
                    key={index}
                    dataKey={linea.dataKey}
                    fill={linea.stroke}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={datosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="periodo" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: '% Cumplimiento', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine y={80} stroke="green" strokeDasharray="5 5" />
                <ReferenceLine y={60} stroke="orange" strokeDasharray="5 5" />

                {obtenerLineas().map((linea, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    dataKey={linea.dataKey}
                    stroke={linea.stroke}
                    strokeWidth={linea.strokeWidth}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="textSecondary">
            No hay suficientes datos para mostrar tendencias en la vista seleccionada
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TendenciasTemporalesChart;