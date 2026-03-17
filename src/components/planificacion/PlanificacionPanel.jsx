import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/Download';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import * as XLSX from 'xlsx';
import { getEspacios, getEspaciosFromCache } from '../../services/catalogService';
import {
  ESTADOS,
  cancelarTarea,
  crearTarea,
  detectarChoque,
  obtenerEspaciosSinVisitar,
  obtenerTareasPorRango,
  validarDuplicadoSemanal
} from '../../services/tareasService';

const TIPO_LABELS = {
  cdvfijo: 'Centro de Vida Fijo',
  cdvparque: 'Centro de Vida Parque/Espacio Comunitario'
};

const ESTADO_CONFIG = {
  [ESTADOS.PENDIENTE]: { label: 'Pendiente', color: 'warning' },
  [ESTADOS.COMPLETADA]: { label: 'Completada', color: 'success' },
  [ESTADOS.CANCELADA]: { label: 'Cancelada', color: 'default' }
};

const normalizeDate = (value) => {
  if (typeof value !== 'string' || value.length < 10) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateString = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date) => {
  const reference = new Date(date);
  const day = reference.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  reference.setDate(reference.getDate() + offsetToMonday);
  return reference;
};

const capitalize = (value) => {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatWeekLabel = (monday, sunday) => {
  const shortFormatter = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
  const longFormatter = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  return `Semana del ${capitalize(shortFormatter.format(monday))} al ${capitalize(longFormatter.format(sunday))}`;
};

const buildWeekRange = (referenceValue = new Date()) => {
  const referenceDate = typeof referenceValue === 'string'
    ? normalizeDate(referenceValue) || new Date()
    : new Date(referenceValue);
  const monday = startOfWeek(referenceDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekdayFormatter = new Intl.DateTimeFormat('es-CO', { weekday: 'short' });
  const dayFormatter = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });

  const dias = Array.from({ length: 7 }, (_, index) => {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + index);

    return {
      iso: formatDateString(currentDate),
      weekdayLabel: capitalize(weekdayFormatter.format(currentDate).replace('.', '')),
      dateLabel: capitalize(dayFormatter.format(currentDate))
    };
  });

  return {
    inicio: formatDateString(monday),
    fin: formatDateString(sunday),
    dias,
    etiqueta: formatWeekLabel(monday, sunday)
  };
};

const shiftWeek = (weekStart, offsetInDays) => {
  const reference = normalizeDate(weekStart) || new Date();
  reference.setDate(reference.getDate() + offsetInDays);
  return buildWeekRange(reference);
};

const sortTareas = (tareas) => {
  const stateOrder = {
    [ESTADOS.PENDIENTE]: 0,
    [ESTADOS.COMPLETADA]: 1,
    [ESTADOS.CANCELADA]: 2
  };

  return [...tareas].sort((left, right) => {
    const estadoDiff = (stateOrder[left.estado] ?? 99) - (stateOrder[right.estado] ?? 99);
    if (estadoDiff !== 0) {
      return estadoDiff;
    }

    return String(left.espacioNombre || '').localeCompare(String(right.espacioNombre || ''), 'es');
  });
};

const groupTasksByDate = (tareas) => (
  sortTareas(tareas).reduce((acc, tarea) => {
    if (!acc[tarea.fechaProgramada]) {
      acc[tarea.fechaProgramada] = [];
    }

    acc[tarea.fechaProgramada].push(tarea);
    return acc;
  }, {})
);

const getTaskChipLabel = (item) => {
  if (item.tareaPendienteFecha && item.tareaPendienteUserEmail) {
    return `${item.nombre} · ${item.tareaPendienteFecha} · ${item.tareaPendienteUserEmail}`;
  }

  if (item.ultimaVisita) {
    return `${item.nombre} · ${item.ultimaVisita}`;
  }

  return item.nombre;
};

const emptyForm = {
  espacio: null,
  fecha: '',
  notas: ''
};

const PlanificacionPanel = ({ user }) => {
  const [semanaActual, setSemanaActual] = useState(() => buildWeekRange(new Date()));
  const [tareas, setTareas] = useState([]);
  const [espaciosSinVisitar, setEspaciosSinVisitar] = useState(null);
  const [espaciosCatalogo, setEspaciosCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatingRules, setValidatingRules] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [alertaR1, setAlertaR1] = useState(null);
  const [alertaR1b, setAlertaR1b] = useState(null);
  const [alertaR3, setAlertaR3] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const validationRunRef = useRef(0);

  const refreshPanel = useCallback(async (targetWeek) => {
    setLoading(true);
    setError('');

    try {
      const [tareasData, resumenData] = await Promise.all([
        obtenerTareasPorRango(targetWeek.inicio, targetWeek.fin),
        obtenerEspaciosSinVisitar()
      ]);

      setTareas(tareasData);
      setEspaciosSinVisitar(resumenData);
    } catch (refreshError) {
      console.error('Error al cargar panel de planificación:', refreshError);
      setError('No se pudo cargar la planificación. Verifica tu conexión y los índices de Firestore.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalogo = useCallback(async () => {
    const cached = getEspaciosFromCache().filter((espacio) => espacio.activo);
    if (cached.length > 0) {
      setEspaciosCatalogo(cached);
    }

    try {
      const data = await getEspacios();
      setEspaciosCatalogo(data.filter((espacio) => espacio.activo));
    } catch (catalogError) {
      console.error('Error al cargar catálogo para planificación:', catalogError);
      if (cached.length === 0) {
        setError('No se pudo cargar el catálogo de espacios.');
      }
    }
  }, []);

  useEffect(() => {
    void loadCatalogo();
  }, [loadCatalogo]);

  useEffect(() => {
    void refreshPanel(semanaActual);
  }, [refreshPanel, semanaActual]);

  useEffect(() => {
    if (!dialogOpen || !formValues.espacio?.id || !formValues.fecha) {
      setAlertaR1(null);
      setAlertaR1b(null);
      setAlertaR3(null);
      setValidatingRules(false);
      return;
    }

    let ignore = false;
    const currentRun = validationRunRef.current + 1;
    validationRunRef.current = currentRun;
    setValidatingRules(true);
    setDialogError('');
    setAlertaR1(null);
    setAlertaR1b(null);
    setAlertaR3(null);

    Promise.all([
      validarDuplicadoSemanal(formValues.espacio.id, formValues.fecha),
      detectarChoque(formValues.espacio.id, formValues.fecha)
    ])
      .then(([duplicado, choque]) => {
        if (ignore || validationRunRef.current !== currentRun) {
          return;
        }

        setAlertaR3(duplicado.bloqueado ? duplicado : null);
        setAlertaR1(choque.hayChoque ? choque : null);
        setAlertaR1b(choque.visitaPrevia ? choque.visitaPrevia : null);
      })
      .catch((validationError) => {
        if (ignore || validationRunRef.current !== currentRun) {
          return;
        }

        console.error('Error al validar reglas de planificación:', validationError);
        setDialogError('No se pudieron validar las reglas de la tarea.');
      })
      .finally(() => {
        if (!ignore && validationRunRef.current === currentRun) {
          setValidatingRules(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [dialogOpen, formValues.espacio?.id, formValues.fecha]);

  const tareasPorFecha = groupTasksByDate(tareas);
  const guardadoBloqueado = saving || validatingRules || !formValues.espacio || !formValues.fecha || Boolean(alertaR3?.bloqueado);
  const totalVisitados = espaciosSinVisitar?.visitados?.length || 0;
  const totalEspacios = espaciosSinVisitar?.totalEspacios || 0;

  const resetDialog = () => {
    setDialogOpen(false);
    setFormValues({ ...emptyForm });
    setDialogError('');
    setAlertaR1(null);
    setAlertaR1b(null);
    setAlertaR3(null);
    setValidatingRules(false);
  };

  const handleCreateTask = async () => {
    if (guardadoBloqueado || !formValues.espacio) {
      return;
    }

    setSaving(true);
    setDialogError('');

    try {
      await crearTarea({
        espacioId: formValues.espacio.id,
        espacioNombre: formValues.espacio.nombre,
        tipoEspacio: formValues.espacio.tipo,
        fechaProgramada: formValues.fecha,
        notas: formValues.notas
      });

      const targetWeek = buildWeekRange(formValues.fecha);
      resetDialog();

      if (targetWeek.inicio !== semanaActual.inicio) {
        setSemanaActual(targetWeek);
      } else {
        await refreshPanel(targetWeek);
      }
    } catch (saveError) {
      console.error('Error al crear tarea:', saveError);
      setDialogError(saveError.message || 'No se pudo crear la tarea.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTask = async (tareaId) => {
    setCancellingId(tareaId);
    setError('');

    try {
      await cancelarTarea(tareaId);
      await refreshPanel(semanaActual);
    } catch (cancelError) {
      console.error('Error al cancelar tarea:', cancelError);
      setError(cancelError.message || 'No se pudo cancelar la tarea.');
    } finally {
      setCancellingId('');
    }
  };

  const handleExportExcel = () => {
    if (tareas.length === 0) {
      setError('No hay tareas en la semana actual para exportar.');
      return;
    }

    const rows = sortTareas(tareas).map((tarea) => ({
      Fecha: tarea.fechaProgramada || '',
      Espacio: tarea.espacioNombre || '',
      Tipo: TIPO_LABELS[tarea.tipoEspacio] || tarea.tipoEspacio || '',
      Usuario: tarea.userEmail || '',
      Estado: ESTADO_CONFIG[tarea.estado]?.label || tarea.estado || '',
      Notas: tarea.notas || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planificacion');
    XLSX.writeFile(workbook, `Planificacion_Semana_${semanaActual.inicio}.xlsx`);
  };

  const renderResumenSection = (title, color, items, emptyLabel) => (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 240 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Chip label={items.length} color={color} size="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
      </Stack>

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {items.map((item) => (
            <Chip
              key={item.id || `${item.nombre}-${item.tareaPendienteFecha || item.ultimaVisita || 'sin-fecha'}`}
              label={getTaskChipLabel(item)}
              color={color}
              variant="outlined"
              sx={{ maxWidth: '100%' }}
            />
          ))}
        </Box>
      )}
    </Paper>
  );

  if (!user?.uid) {
    return (
      <Alert severity="warning" sx={{ mt: 3 }}>
        Debes iniciar sesión para acceder al módulo de planificación.
      </Alert>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Planificación de visitas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crea tus tareas, revisa la coordinación semanal y detecta espacios pendientes del mes.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}>
              Exportar Excel
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              Nueva Tarea
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ width: '100%' }}
            >
              <Typography fontWeight={700}>
                Espacios sin visitar este mes
              </Typography>
              <Chip
                size="small"
                color="primary"
                label={`${totalVisitados} de ${totalEspacios} espacios visitados`}
              />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {!espaciosSinVisitar ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                {renderResumenSection(
                  'Ya visitados',
                  'success',
                  espaciosSinVisitar.visitados,
                  'Aún no hay visitas registradas este mes.'
                )}
                {renderResumenSection(
                  'Sin visitar, con tarea',
                  'warning',
                  espaciosSinVisitar.conTareaPendiente,
                  'No hay espacios pendientes con tarea programada.'
                )}
                {renderResumenSection(
                  'Sin visitar, sin tarea',
                  'error',
                  espaciosSinVisitar.sinVisitarSinTarea,
                  'Todos los espacios pendientes ya tienen una tarea asociada.'
                )}
              </Stack>
            )}
          </AccordionDetails>
        </Accordion>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={() => setSemanaActual(shiftWeek(semanaActual.inicio, -7))}>
                <ChevronLeftIcon />
              </IconButton>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {semanaActual.etiqueta}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tareas.length} tareas visibles en esta semana
                </Typography>
              </Box>
              <IconButton onClick={() => setSemanaActual(shiftWeek(semanaActual.inicio, 7))}>
                <ChevronRightIcon />
              </IconButton>
            </Stack>

            <Chip
              color="primary"
              variant="outlined"
              label={`Tus tareas se resaltan con borde azul`}
            />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader sx={{ minWidth: 960 }}>
                <TableHead>
                  <TableRow>
                    {semanaActual.dias.map((dia) => (
                      <TableCell key={dia.iso} sx={{ bgcolor: 'grey.100', verticalAlign: 'top', minWidth: 220 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {dia.weekdayLabel}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {dia.dateLabel}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    {semanaActual.dias.map((dia) => {
                      const tareasDia = tareasPorFecha[dia.iso] || [];

                      return (
                        <TableCell key={dia.iso} sx={{ verticalAlign: 'top', height: 320 }}>
                          {tareasDia.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              Sin tareas programadas.
                            </Typography>
                          ) : (
                            <Stack spacing={1.25}>
                              {tareasDia.map((tarea) => {
                                const estadoConfig = ESTADO_CONFIG[tarea.estado] || ESTADO_CONFIG[ESTADOS.PENDIENTE];
                                const isOwnTask = tarea.userId === user.uid;
                                const isPendingOwnTask = isOwnTask && tarea.estado === ESTADOS.PENDIENTE;

                                return (
                                  <Card
                                    key={tarea.id}
                                    variant="outlined"
                                    sx={{
                                      borderColor: isOwnTask ? 'primary.main' : 'divider',
                                      borderWidth: isOwnTask ? 2 : 1,
                                      opacity: tarea.estado === ESTADOS.CANCELADA ? 0.7 : 1
                                    }}
                                  >
                                    <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                                      <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                                          <Typography variant="subtitle2" fontWeight={700}>
                                            {tarea.espacioNombre}
                                          </Typography>
                                          <Chip size="small" color={estadoConfig.color} label={estadoConfig.label} />
                                        </Stack>

                                        <Typography variant="body2" color="text.secondary">
                                          {TIPO_LABELS[tarea.tipoEspacio] || tarea.tipoEspacio || 'Tipo no definido'}
                                        </Typography>

                                        <Divider />

                                        <Typography variant="body2">
                                          {tarea.userDisplayName || tarea.userEmail || 'Sin usuario asignado'}
                                        </Typography>

                                        {tarea.notas && (
                                          <Typography variant="body2" color="text.secondary">
                                            {tarea.notas}
                                          </Typography>
                                        )}

                                        {isPendingOwnTask && (
                                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Tooltip title="Cancelar tarea">
                                              <span>
                                                <IconButton
                                                  size="small"
                                                  color="error"
                                                  onClick={() => handleCancelTask(tarea.id)}
                                                  disabled={cancellingId === tarea.id}
                                                >
                                                  {cancellingId === tarea.id ? (
                                                    <CircularProgress size={18} />
                                                  ) : (
                                                    <EventBusyIcon fontSize="small" />
                                                  )}
                                                </IconButton>
                                              </span>
                                            </Tooltip>
                                          </Box>
                                        )}
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </Stack>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>

      <Dialog open={dialogOpen} onClose={saving ? undefined : resetDialog} fullWidth maxWidth="sm">
        <DialogTitle>Nueva Tarea</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              options={espaciosCatalogo}
              value={formValues.espacio}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option?.nombre || ''}
              onChange={(_, newValue) => {
                setFormValues((prev) => ({ ...prev, espacio: newValue }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Espacio"
                  placeholder="Selecciona un espacio activo"
                />
              )}
            />

            <TextField
              label="Fecha programada"
              type="date"
              value={formValues.fecha}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, fecha: event.target.value }));
              }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notas"
              value={formValues.notas}
              multiline
              minRows={3}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, notas: event.target.value }));
              }}
            />

            {validatingRules && (
              <Alert severity="info">
                Validando reglas de planificación...
              </Alert>
            )}

            {alertaR3?.bloqueado && (
              <Alert severity="error">
                Ya tienes una visita programada a este espacio esta semana
                {alertaR3.tareaExistente?.fechaProgramada ? ` (${alertaR3.tareaExistente.fechaProgramada})` : ''}.
              </Alert>
            )}

            {alertaR1?.hayChoque && (
              <Alert severity="warning">
                {alertaR1.tareasConflicto.map((tarea) => tarea.userDisplayName || tarea.userEmail).join(', ')}
                {' '}ya tiene programada una visita a este espacio el {formValues.fecha}. Puedes continuar si deseas.
              </Alert>
            )}

            {alertaR1b && (
              <Alert severity="info">
                Este espacio ya fue visitado el {alertaR1b.fechaVisita} por {alertaR1b.apoyoSupervision || alertaR1b.userEmail}
                {alertaR1b.porcentajeCumplimiento ? ` (${alertaR1b.porcentajeCumplimiento}% cumplimiento)` : ''}.
                Puedes continuar si necesitas otra visita.
              </Alert>
            )}

            {dialogError && (
              <Alert severity="error">
                {dialogError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleCreateTask} variant="contained" disabled={guardadoBloqueado}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanificacionPanel;
