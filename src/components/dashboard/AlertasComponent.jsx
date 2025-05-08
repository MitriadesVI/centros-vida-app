import React, { useMemo } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Chip, 
  Divider, 
  IconButton, 
  Tooltip, 
  Collapse,
  Button
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FilterListIcon from '@mui/icons-material/FilterList';

const AlertasComponent = ({ datos }) => {
  const [verTodasAlertas, setVerTodasAlertas] = React.useState(false);
  const [alertasRevisadas, setAlertasRevisadas] = React.useState([]);

  // Función para agrupar formularios por semana
  const agruparPorSemana = (formularios) => {
    if (!formularios || formularios.length === 0) return {};
    
    const semanas = {};
    
    formularios.forEach(form => {
      if (!form.fechaVisita) return;
      
      // Crear fecha
      const fecha = new Date(form.fechaVisita);
      
      // Obtener el inicio de semana (lunes)
      const inicioSemana = new Date(fecha);
      const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      const diffInicio = diaSemana === 0 ? 6 : diaSemana - 1; // Ajuste para que semana empiece en lunes
      inicioSemana.setDate(fecha.getDate() - diffInicio);
      
      // Crear clave para esta semana
      const semanaKey = inicioSemana.toISOString().split('T')[0];
      
      // Inicializar semana si no existe
      if (!semanas[semanaKey]) {
        semanas[semanaKey] = {
          inicio: semanaKey,
          formularios: []
        };
      }
      
      // Añadir formulario a esta semana
      semanas[semanaKey].formularios.push(form);
    });
    
    return semanas;
  };

  // Función para agrupar formularios por mes
  const agruparPorMes = (formularios) => {
    if (!formularios || formularios.length === 0) return {};
    
    const meses = {};
    
    formularios.forEach(form => {
      if (!form.fechaVisita) return;
      
      // Crear fecha
      const fecha = new Date(form.fechaVisita);
      
      // Crear clave para este mes (YYYY-MM)
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      // Inicializar mes si no existe
      if (!meses[mesKey]) {
        meses[mesKey] = {
          mes: mesKey,
          formularios: []
        };
      }
      
      // Añadir formulario a este mes
      meses[mesKey].formularios.push(form);
    });
    
    return meses;
  };

  // Función para calcular promedio de cumplimiento de un grupo de formularios
  const calcularPromedioCumplimiento = (formularios) => {
    if (!formularios || formularios.length === 0) return 0;
    
    const suma = formularios.reduce((total, form) => total + (form.porcentajeCumplimiento || 0), 0);
    return Math.round(suma / formularios.length);
  };

  // Función para calcular promedio de cumplimiento por componente
  const calcularPromedioComponente = (formularios, componente) => {
    if (!formularios || formularios.length === 0) return 0;
    
    let suma = 0;
    let contador = 0;
    
    formularios.forEach(form => {
      if (form.puntajePorComponente && form.puntajePorComponente[componente]) {
        suma += (form.puntajePorComponente[componente].porcentaje || 0);
        contador++;
      }
    });
    
    return contador > 0 ? Math.round(suma / contador) : 0;
  };

  // Detectar descenso en cumplimiento de contratista frente a semana anterior
  const detectarDescensoContratistas = (formularios) => {
    const alertas = [];
    if (!formularios || formularios.length < 2) return alertas;
    
    // Agrupar por semana
    const semanas = agruparPorSemana(formularios);
    const semanasSorted = Object.values(semanas).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
    
    // Necesitamos al menos 2 semanas para comparar
    if (semanasSorted.length < 2) return alertas;
    
    // Obtener las dos semanas más recientes
    const semanaActual = semanasSorted[0];
    const semanaAnterior = semanasSorted[1];
    
    // Agrupar por contratista en cada semana
    const contraActual = {};
    const contraAnterior = {};
    
    semanaActual.formularios.forEach(form => {
      if (!form.contratista) return;
      if (!contraActual[form.contratista]) contraActual[form.contratista] = [];
      contraActual[form.contratista].push(form);
    });
    
    semanaAnterior.formularios.forEach(form => {
      if (!form.contratista) return;
      if (!contraAnterior[form.contratista]) contraAnterior[form.contratista] = [];
      contraAnterior[form.contratista].push(form);
    });
    
    // Comparar cumplimiento para cada contratista
    Object.keys(contraActual).forEach(contratista => {
      if (contraAnterior[contratista]) {
        const promedioActual = calcularPromedioCumplimiento(contraActual[contratista]);
        const promedioAnterior = calcularPromedioCumplimiento(contraAnterior[contratista]);
        
        const diferencia = promedioActual - promedioAnterior;
        
        if (diferencia < 0) {
          // Detectamos descenso
          const descenso = Math.abs(diferencia);
          const tipo = descenso >= 10 ? 'critica' : 'advertencia';
          
          alertas.push({
            tipo,
            mensaje: `Descenso en cumplimiento de ${contratista}`,
            detalle: `Disminución de ${descenso}% frente a la semana anterior (${promedioActual}% vs ${promedioAnterior}%)`,
            fecha: new Date().toISOString()
          });
        }
      }
    });
    
    return alertas;
  };

  // Detectar descenso en componente de contratista frente a semana anterior
  const detectarDescensoComponentes = (formularios) => {
    const alertas = [];
    if (!formularios || formularios.length < 2) return alertas;
    
    // Lista de componentes a monitorear
    const componentes = [
      'COMPONENTE TÉCNICO',
      'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN',
      'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN'
    ];
    
    // Nombres cortos para los componentes
    const nombresCortos = {
      'COMPONENTE TÉCNICO': 'Técnico',
      'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN': 'Nutrición',
      'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN': 'Infraestructura'
    };
    
    // Agrupar por semana y mes
    const semanas = agruparPorSemana(formularios);
    const meses = agruparPorMes(formularios);
    
    const semanasSorted = Object.values(semanas).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
    const mesesSorted = Object.values(meses).sort((a, b) => b.mes.localeCompare(a.mes));
    
    // Verificar si tenemos suficientes datos para comparar
    if (semanasSorted.length >= 2) {
      // Comparar semanas
      const semanaActual = semanasSorted[0];
      const semanaAnterior = semanasSorted[1];
      
      // Agrupar por contratista en cada semana
      const contraActual = {};
      const contraAnterior = {};
      
      semanaActual.formularios.forEach(form => {
        if (!form.contratista) return;
        if (!contraActual[form.contratista]) contraActual[form.contratista] = [];
        contraActual[form.contratista].push(form);
      });
      
      semanaAnterior.formularios.forEach(form => {
        if (!form.contratista) return;
        if (!contraAnterior[form.contratista]) contraAnterior[form.contratista] = [];
        contraAnterior[form.contratista].push(form);
      });
      
      // Comparar componentes para cada contratista
      Object.keys(contraActual).forEach(contratista => {
        if (contraAnterior[contratista]) {
          // Revisar cada componente
          componentes.forEach(componente => {
            const promedioActual = calcularPromedioComponente(contraActual[contratista], componente);
            const promedioAnterior = calcularPromedioComponente(contraAnterior[contratista], componente);
            
            if (promedioAnterior > 0) {  // Evitar divisiones por cero
              const diferencia = promedioActual - promedioAnterior;
              
              if (diferencia < -5) {  // Umbral de 5% para alertas
                // Detectamos descenso
                const descenso = Math.abs(diferencia);
                const tipo = descenso >= 10 ? 'critica' : 'advertencia';
                
                alertas.push({
                  tipo,
                  mensaje: `Descenso en componente ${nombresCortos[componente]} de ${contratista}`,
                  detalle: `Disminución de ${descenso}% frente a la semana anterior (${promedioActual}% vs ${promedioAnterior}%)`,
                  fecha: new Date().toISOString()
                });
              }
            }
          });
        }
      });
    }
    
    // Comparar meses si tenemos suficientes datos
    if (mesesSorted.length >= 2) {
      // Comparación mensual
      const mesActual = mesesSorted[0];
      const mesAnterior = mesesSorted[1];
      
      // Agrupar por contratista en cada mes
      const contraActualMes = {};
      const contraAnteriorMes = {};
      
      mesActual.formularios.forEach(form => {
        if (!form.contratista) return;
        if (!contraActualMes[form.contratista]) contraActualMes[form.contratista] = [];
        contraActualMes[form.contratista].push(form);
      });
      
      mesAnterior.formularios.forEach(form => {
        if (!form.contratista) return;
        if (!contraAnteriorMes[form.contratista]) contraAnteriorMes[form.contratista] = [];
        contraAnteriorMes[form.contratista].push(form);
      });
      
      // Comparar componentes para cada contratista (mensual)
      Object.keys(contraActualMes).forEach(contratista => {
        if (contraAnteriorMes[contratista]) {
          // Revisar cada componente
          componentes.forEach(componente => {
            const promedioActual = calcularPromedioComponente(contraActualMes[contratista], componente);
            const promedioAnterior = calcularPromedioComponente(contraAnteriorMes[contratista], componente);
            
            if (promedioAnterior > 0) {  // Evitar divisiones por cero
              const diferencia = promedioActual - promedioAnterior;
              
              if (diferencia < -7) {  // Umbral un poco mayor para alertas mensuales
                // Detectamos descenso
                const descenso = Math.abs(diferencia);
                const tipo = descenso >= 15 ? 'critica' : 'advertencia';
                
                // Formatear nombres de meses para el mensaje
                const [anoActual, mesActualNum] = mesActual.mes.split('-');
                const [anoAnterior, mesAnteriorNum] = mesAnterior.mes.split('-');
                
                const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                const mesActualNombre = nombresMeses[parseInt(mesActualNum) - 1];
                const mesAnteriorNombre = nombresMeses[parseInt(mesAnteriorNum) - 1];
                
                alertas.push({
                  tipo,
                  mensaje: `Descenso mensual en ${nombresCortos[componente]} de ${contratista}`,
                  detalle: `Disminución de ${descenso}% comparando ${mesActualNombre} con ${mesAnteriorNombre} (${promedioActual}% vs ${promedioAnterior}%)`,
                  fecha: new Date().toISOString()
                });
              }
            }
          });
        }
      });
    }
    
    return alertas;
  };

  // Detectar parques/espacios comunitarios con menos de 30 personas mayores
  const detectarBajaAsistencia = (formularios) => {
    const alertas = [];
    if (!formularios || formularios.length === 0) return alertas;
    
    // Considerar solo los formularios más recientes para cada espacio
    const espacios = {};
    
    formularios.forEach(form => {
      if (!form.espacioAtencion || form.tipoEspacio !== 'cdvparque') return;
      
      if (!espacios[form.espacioAtencion] || new Date(form.fechaVisita) > new Date(espacios[form.espacioAtencion].fechaVisita)) {
        espacios[form.espacioAtencion] = form;
      }
    });
    
    // Revisar cada espacio
    Object.values(espacios).forEach(form => {
      const pmAsistentes = parseInt(form.pmAsistentes || 0);
      
      if (pmAsistentes < 30) {
        // Determinar la severidad
        const tipo = pmAsistentes < 20 ? 'critica' : 'advertencia';
        
        alertas.push({
          tipo,
          mensaje: `Baja asistencia en ${form.espacioAtencion}`,
          detalle: `Solo ${pmAsistentes} personas mayores asistieron (menos de 30 recomendadas)`,
          fecha: form.fechaVisita
        });
      }
    });
    
    return alertas;
  };

  // Detectar disminución en cumplimiento por espacio frente a visita anterior
  const detectarDisminucionEspacios = (formularios) => {
    const alertas = [];
    if (!formularios || formularios.length < 2) return alertas;
    
    // Agrupar formularios por espacio de atención
    const espacios = {};
    
    formularios.forEach(form => {
      if (!form.espacioAtencion || !form.fechaVisita) return;
      
      if (!espacios[form.espacioAtencion]) {
        espacios[form.espacioAtencion] = [];
      }
      
      espacios[form.espacioAtencion].push(form);
    });
    
    // Para cada espacio, comparar las dos visitas más recientes
    Object.keys(espacios).forEach(espacio => {
      if (espacios[espacio].length >= 2) {
        // Ordenar por fecha (más reciente primero)
        const visitas = espacios[espacio].sort((a, b) => new Date(b.fechaVisita) - new Date(a.fechaVisita));
        
        const ultimaVisita = visitas[0];
        const penultimaVisita = visitas[1];
        
        const ultimoCumplimiento = ultimaVisita.porcentajeCumplimiento || 0;
        const penultimoCumplimiento = penultimaVisita.porcentajeCumplimiento || 0;
        
        const diferencia = ultimoCumplimiento - penultimoCumplimiento;
        
        if (diferencia < -5) {  // Umbral de 5% para alertas
          // Detectamos descenso
          const descenso = Math.abs(diferencia);
          const tipo = descenso >= 10 ? 'critica' : 'advertencia';
          
          alertas.push({
            tipo,
            mensaje: `Descenso en cumplimiento de ${espacio}`,
            detalle: `Disminución de ${descenso}% frente a la visita anterior (${ultimoCumplimiento}% vs ${penultimoCumplimiento}%)`,
            fecha: ultimaVisita.fechaVisita
          });
        }
      }
    });
    
    return alertas;
  };

  // Detectar visitas con resultado debajo del 80%
  const detectarVisitasBajoCumplimiento = (formularios) => {
    const alertas = [];
    if (!formularios || formularios.length === 0) return alertas;
    
    // Filtrar visitas recientes (último mes) por simplicidad
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    
    const visitasRecientes = formularios.filter(form => 
      form.fechaVisita && new Date(form.fechaVisita) >= unMesAtras
    ).sort((a, b) => new Date(b.fechaVisita) - new Date(a.fechaVisita));
    
    // Detectar visitas con bajo cumplimiento
    visitasRecientes.forEach(form => {
      const cumplimiento = form.porcentajeCumplimiento || 0;
      
      if (cumplimiento < 80) {
        // Determinar severidad
        const tipo = cumplimiento < 60 ? 'critica' : 'advertencia';
        
        alertas.push({
          tipo,
          mensaje: `Visita con bajo cumplimiento en ${form.espacioAtencion}`,
          detalle: `Resultado de ${cumplimiento}% (por debajo del 80% recomendado)`,
          fecha: form.fechaVisita
        });
      }
    });
    
    // Limitar el número de alertas para no saturar
    return alertas.slice(0, 5);
  };

  // Detectar ítems con 0% de cumplimiento
  const detectarItemsCriticos = (formularios) => {
    const alertas = [];
    if (!formularios || formularios.length === 0) return alertas;
    
    // Filtrar visitas recientes (último mes) por simplicidad
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    
    const visitasRecientes = formularios.filter(form => 
      form.fechaVisita && new Date(form.fechaVisita) >= unMesAtras
    );
    
    // Buscar ítems con 0% de cumplimiento
    visitasRecientes.forEach(form => {
      if (!form.detalleItems) return;
      
      // Revisar cada componente
      Object.keys(form.detalleItems).forEach(componente => {
        // Revisar cada ítem del componente
        Object.keys(form.detalleItems[componente]).forEach(itemId => {
          const item = form.detalleItems[componente][itemId];
          
          if (item && item.valor === 0) {
            alertas.push({
              tipo: 'critica',
              mensaje: `Ítem con 0% de cumplimiento en ${form.espacioAtencion}`,
              detalle: `${itemId}: ${item.label || 'Sin descripción'} (Visita del ${form.fechaVisita})`,
              fecha: form.fechaVisita
            });
          }
        });
      });
    });
    
    // Limitar el número de alertas para no saturar
    return alertas.slice(0, 5);
  };

  // Detectar reducción en frecuencia de supervisión
  const detectarReduccionVisitas = (formularios) => {
    const alertas = [];
    if (!formularios || formularios.length < 2) return alertas;
    
    // Agrupar por semana
    const semanas = agruparPorSemana(formularios);
    const semanasSorted = Object.values(semanas).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
    
    // Necesitamos al menos 2 semanas para comparar
    if (semanasSorted.length < 2) return alertas;
    
    // Obtener las dos semanas más recientes
    const semanaActual = semanasSorted[0];
    const semanaAnterior = semanasSorted[1];
    
    // Comparar número de visitas
    const visitasActual = semanaActual.formularios.length;
    const visitasAnterior = semanaAnterior.formularios.length;
    
    if (visitasActual < visitasAnterior) {
      const reduccion = visitasAnterior - visitasActual;
      const porcentajeReduccion = Math.round((reduccion / visitasAnterior) * 100);
      
      // Determinar severidad según el porcentaje de reducción
      const tipo = porcentajeReduccion >= 30 ? 'critica' : 'advertencia';
      
      alertas.push({
        tipo,
        mensaje: `Reducción en visitas de supervisión`,
        detalle: `Esta semana se realizaron ${reduccion} visitas menos que la semana anterior (${visitasActual} vs ${visitasAnterior})`,
        fecha: new Date().toISOString()
      });
    }
    
    return alertas;
  };

  // Generar todas las alertas
  const alertas = useMemo(() => {
    if (!datos || !datos.formularios) return [];
    
    let todasAlertas = [];
    
    // Generar los diferentes tipos de alertas
    todasAlertas = todasAlertas.concat(
      detectarDescensoContratistas(datos.formularios),
      detectarDescensoComponentes(datos.formularios),
      detectarBajaAsistencia(datos.formularios),
      detectarDisminucionEspacios(datos.formularios),
      detectarVisitasBajoCumplimiento(datos.formularios),
      detectarItemsCriticos(datos.formularios),
      detectarReduccionVisitas(datos.formularios)
    );
    
    // Eliminar posibles duplicados
    const alertasUnicas = [];
    const mensajesVistos = new Set();
    
    todasAlertas.forEach(alerta => {
      const mensajeKey = `${alerta.mensaje}-${alerta.detalle}`;
      if (!mensajesVistos.has(mensajeKey)) {
        mensajesVistos.add(mensajeKey);
        alertasUnicas.push(alerta);
      }
    });
    
    // Ordenar por tipo (críticas primero) y fecha
    return alertasUnicas.sort((a, b) => {
      if (a.tipo === 'critica' && b.tipo !== 'critica') return -1;
      if (a.tipo !== 'critica' && b.tipo === 'critica') return 1;
      return new Date(b.fecha) - new Date(a.fecha);
    });
  }, [datos]);

  // Filtrar alertas que no han sido revisadas
  const alertasPendientes = alertas.filter(alerta => 
    !alertasRevisadas.includes(`${alerta.mensaje}-${alerta.detalle}`)
  );

  // Obtener conteos
  const alertasCriticas = alertasPendientes.filter(alerta => alerta.tipo === 'critica');
  const alertasAdvertencia = alertasPendientes.filter(alerta => alerta.tipo === 'advertencia');
  
  // Cuántas alertas mostrar en la vista contraída
  const alertasVisibles = verTodasAlertas ? alertasPendientes : alertasPendientes.slice(0, 3);
  
  // Marcar una alerta como revisada
  const marcarComoRevisada = (alerta) => {
    const alertaKey = `${alerta.mensaje}-${alerta.detalle}`;
    setAlertasRevisadas([...alertasRevisadas, alertaKey]);
  };

  // Si no hay datos suficientes, mostrar un mensaje
  if (!datos || !datos.formularios || datos.formularios.length < 2) {
    return (
      <Paper sx={{ p: 3, mb: 4, bgcolor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
          <Typography variant="body1" color="textSecondary">
            Se necesitan más datos para generar alertas. Añade más formularios para activar esta funcionalidad.
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Si no hay alertas pendientes, mostrar un mensaje positivo
  if (alertasPendientes.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 4, bgcolor: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
          <CheckCircleIcon sx={{ color: '#2e7d32', mr: 1, fontSize: 28 }} />
          <Typography variant="h6" color="#2e7d32">
            No hay alertas activas en este momento
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 4, borderLeft: '4px solid #d32f2f' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ mr: 1, color: '#d32f2f' }} />
          Alertas del Sistema ({alertasPendientes.length})
        </Typography>
        
        <Box>
          <Chip 
            icon={<ErrorIcon />} 
            label={`Críticas: ${alertasCriticas.length}`} 
            color="error" 
            size="small" 
            sx={{ mr: 1 }} 
          />
          <Chip 
            icon={<WarningIcon />} 
            label={`Advertencias: ${alertasAdvertencia.length}`} 
            color="warning" 
            size="small" 
          />
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <List dense>
        {alertasVisibles.map((alerta, index) => (
          <ListItem 
            key={index}
            sx={{ 
              mb: 1,
              bgcolor: alerta.tipo === 'critica' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
              borderRadius: 1
            }}
          >
            <ListItemIcon>
              {alerta.tipo === 'critica' ? <ErrorIcon color="error" /> : <WarningIcon color="warning" />}
            </ListItemIcon>
            <ListItemText
              primary={alerta.mensaje}
              secondary={alerta.detalle}
            />
            <Tooltip title="Marcar como revisada">
              <IconButton edge="end" size="small" onClick={() => marcarComoRevisada(alerta)}>
                <CheckCircleOutlineIcon />
              </IconButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      
      {/* Botón para ver más/menos alertas */}
      {alertasPendientes.length > 3 && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Button 
            size="small"
            onClick={() => setVerTodasAlertas(!verTodasAlertas)}
            endIcon={verTodasAlertas ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          >
            {verTodasAlertas ? 'Ver menos' : `Ver todas (${alertasPendientes.length})`}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default AlertasComponent;