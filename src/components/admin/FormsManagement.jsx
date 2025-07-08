import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Checkbox,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Search as SearchIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  Warning as WarningIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const FormsManagement = () => {
  // Estados principales
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractor, setSelectedContractor] = useState('');
  const [selectedSpaceType, setSelectedSpaceType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);
  
  // Estados para paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalForms, setTotalForms] = useState(0);
  
  // Estados para selección múltiple
  const [selectedForms, setSelectedForms] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Estados para diálogos
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Estados para duplicados
  const [duplicates, setDuplicates] = useState([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);

  // Estados para debug
  const [debugInfo, setDebugInfo] = useState(null);

  // Opciones para filtros (actualizadas según tu estructura)
  const contractors = ['CUC', 'FUNDACARIBE'];
  const spaceTypes = [
    { value: 'cdvfijo', label: 'Centro de Vida Fijo' },
    { value: 'cdvparque', label: 'Centro de Vida Parque/Espacio Comunitario' }
  ];

  // 🔧 FUNCIÓN CORREGIDA: Cargar formularios con la estructura real
  const loadForms = async (pageNum = 0, searchFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Cargando formularios desde formSummaries...');
      
      // Consulta base: excluir autoguardados y limitar resultados
      let q = query(
        collection(db, 'formSummaries'),
        where('isAutoSave', '!=', true), // Excluir autoguardados
        orderBy('createdAt', 'desc'),
        limit(200) // Limitar para mejor rendimiento
      );
      
      const snapshot = await getDocs(q);
      console.log(`📊 Documentos obtenidos: ${snapshot.size}`);
      
      const formsData = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        formsData.push({
          id: doc.id,
          ...data,
          // Convertir timestamp si existe
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        });
      });
      
      // 🔧 Aplicar filtros localmente (usando los campos reales)
      let filteredForms = formsData;
      
      // Filtro por término de búsqueda
      if (searchFilters.searchTerm) {
        const term = searchFilters.searchTerm.toLowerCase();
        filteredForms = filteredForms.filter(form => {
          const searchableText = [
            form.espacioAtencion,
            form.contratista,
            form.apoyoSupervision,
            form.userEmail
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchableText.includes(term);
        });
      }

      // Filtro por contratista
      if (searchFilters.contractor) {
        filteredForms = filteredForms.filter(form => 
          form.contratista?.includes(searchFilters.contractor)
        );
      }

      // Filtro por tipo de espacio
      if (searchFilters.spaceType) {
        filteredForms = filteredForms.filter(form => 
          form.tipoEspacio === searchFilters.spaceType
        );
      }

      // Filtro por fecha desde
      if (searchFilters.dateFrom) {
        filteredForms = filteredForms.filter(form => 
          form.fechaVisita >= searchFilters.dateFrom
        );
      }

      // Filtro por fecha hasta
      if (searchFilters.dateTo) {
        filteredForms = filteredForms.filter(form => 
          form.fechaVisita <= searchFilters.dateTo
        );
      }
      
      setForms(filteredForms);
      setTotalForms(filteredForms.length);
      setDebugInfo(`Cargados ${filteredForms.length} formularios de ${formsData.length} totales`);
      
      if (filteredForms.length === 0 && formsData.length > 0) {
        setError('No se encontraron formularios que coincidan con los filtros aplicados');
      } else if (formsData.length === 0) {
        setError('No hay formularios en la base de datos');
      }
      
    } catch (err) {
      console.error('❌ Error al cargar formularios:', err);
      setError(`Error al cargar formularios: ${err.message}`);
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FUNCIÓN CORREGIDA: Buscar duplicados (usando campos reales)
  const findDuplicates = async () => {
    setDuplicatesLoading(true);
    
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'formSummaries'),
          where('isAutoSave', '!=', true)
        )
      );
      
      const allForms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Agrupar por espacio de atención y fecha
      const grouped = {};
      allForms.forEach(form => {
        const key = `${form.espacioAtencion || 'sin-espacio'}-${form.fechaVisita || 'sin-fecha'}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(form);
      });
      
      // Encontrar grupos con más de un formulario
      const duplicateGroups = Object.values(grouped).filter(group => group.length > 1);
      const duplicatesList = duplicateGroups.flat();
      
      setDuplicates(duplicatesList);
      setShowDuplicates(true);
      
      if (duplicatesList.length === 0) {
        setSuccess('No se encontraron formularios duplicados');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setSuccess(`Se encontraron ${duplicatesList.length} formularios duplicados`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error al buscar duplicados:', err);
      setError('Error al buscar duplicados');
    } finally {
      setDuplicatesLoading(false);
    }
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    const filters = {
      searchTerm,
      contractor: selectedContractor,
      spaceType: selectedSpaceType,
      dateFrom,
      dateTo
    };
    
    loadForms(0, filters);
    setPage(0);
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedContractor('');
    setSelectedSpaceType('');
    setDateFrom('');
    setDateTo('');
    setShowDuplicates(false);
    setSelectedForms([]);
    setSelectAll(false);
    loadForms();
  };

  // Recargar datos
  const handleRefresh = () => {
    handleClearFilters();
    setError(null);
    setSuccess(null);
  };

  // Manejar selección
  const handleSelectForm = (formId) => {
    setSelectedForms(prev => 
      prev.includes(formId) 
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedForms([]);
    } else {
      setSelectedForms(forms.map(form => form.id));
    }
    setSelectAll(!selectAll);
  };

  // Ver formulario
  const handleViewForm = (form) => {
    setSelectedForm(form);
    setViewDialogOpen(true);
  };

  // Eliminar formulario individual
  const handleDeleteForm = async (formId) => {
    if (!formId) return;
    
    try {
      await deleteDoc(doc(db, 'formSummaries', formId));
      setForms(forms.filter(form => form.id !== formId));
      setSuccess('Formulario eliminado exitosamente');
      setDeleteDialogOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al eliminar formulario:', err);
      setError(`Error al eliminar el formulario: ${err.message}`);
    }
  };

  // Eliminar múltiples formularios
  const handleBulkDelete = async () => {
    if (selectedForms.length === 0) return;
    
    try {
      const deletePromises = selectedForms.map(formId => 
        deleteDoc(doc(db, 'formSummaries', formId))
      );
      
      await Promise.all(deletePromises);
      
      setForms(forms.filter(form => !selectedForms.includes(form.id)));
      setSelectedForms([]);
      setSelectAll(false);
      setSuccess(`${selectedForms.length} formularios eliminados exitosamente`);
      setBulkDeleteDialogOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al eliminar formularios:', err);
      setError(`Error al eliminar los formularios: ${err.message}`);
    }
  };

  // 🔧 FUNCIÓN CORREGIDA: Exportar datos (usando campos reales)
  const handleExport = () => {
    const dataToExport = selectedForms.length > 0 
      ? forms.filter(form => selectedForms.includes(form.id))
      : forms;
    
    if (dataToExport.length === 0) {
      setError('No hay datos para exportar');
      return;
    }

    const csvContent = [
      [
        'ID',
        'Fecha Visita',
        'Espacio de Atención',
        'Contratista',
        'Apoyo Supervisión',
        'Tipo Espacio',
        'PM Asistentes',
        'Puntaje Total',
        'Porcentaje Cumplimiento',
        'Usuario',
        'Estado',
        'Creado'
      ],
      ...dataToExport.map(form => [
        form.id,
        form.fechaVisita || '',
        form.espacioAtencion || '',
        form.contratista || '',
        form.apoyoSupervision || '',
        form.tipoEspacio === 'cdvfijo' ? 'Centro Fijo' : form.tipoEspacio === 'cdvparque' ? 'Espacio Comunitario' : form.tipoEspacio || '',
        form.pmAsistentes || 0,
        form.puntajeTotal || 0,
        form.porcentajeCumplimiento || 0,
        form.userEmail || '',
        form.isComplete ? 'Finalizado' : 'Borrador',
        form.createdAt ? (form.createdAt instanceof Date ? form.createdAt.toLocaleString() : form.createdAt) : ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formularios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setSuccess('Datos exportados exitosamente');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO');
    } catch {
      return dateString;
    }
  };

  // Efectos
  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    setSelectAll(selectedForms.length === forms.length && forms.length > 0);
  }, [selectedForms, forms]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Gestión de Formularios
        </Typography>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          startIcon={<RefreshIcon />}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {debugInfo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {debugInfo}
        </Alert>
      )}

      {/* Panel de filtros */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filtros y Búsqueda
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Espacio, contratista, usuario..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Contratista</InputLabel>
                <Select
                  value={selectedContractor}
                  label="Contratista"
                  onChange={(e) => setSelectedContractor(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {contractors.map(contractor => (
                    <MenuItem key={contractor} value={contractor}>
                      {contractor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Espacio</InputLabel>
                <Select
                  value={selectedSpaceType}
                  label="Tipo de Espacio"
                  onChange={(e) => setSelectedSpaceType(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {spaceTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Desde"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Hasta"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleApplyFilters}
                  disabled={loading}
                >
                  Aplicar Filtros
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<ClearIcon />}
                >
                  Limpiar
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Button
                variant="outlined"
                onClick={findDuplicates}
                disabled={duplicatesLoading}
                startIcon={duplicatesLoading ? <CircularProgress size={20} /> : <WarningIcon />}
                color="warning"
              >
                {duplicatesLoading ? 'Buscando...' : 'Buscar Duplicados'}
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Acciones masivas */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Checkbox
              checked={selectAll}
              onChange={handleSelectAll}
              indeterminate={selectedForms.length > 0 && selectedForms.length < forms.length}
            />
            <Typography variant="body1">
              {selectedForms.length > 0 
                ? `${selectedForms.length} formularios seleccionados`
                : `Total: ${forms.length} formularios`}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleExport}
              startIcon={<ExportIcon />}
              disabled={forms.length === 0}
            >
              Exportar
            </Button>
            
            {selectedForms.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={() => setBulkDeleteDialogOpen(true)}
                startIcon={<DeleteIcon />}
              >
                Eliminar Seleccionados
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Alerta de duplicados */}
      {showDuplicates && duplicates.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">
            Se encontraron {duplicates.length} formularios duplicados
          </Typography>
          <Typography variant="body2">
            Revise los formularios marcados en la tabla para eliminar duplicados.
          </Typography>
        </Alert>
      )}

      {/* Tabla de formularios */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  indeterminate={selectedForms.length > 0 && selectedForms.length < forms.length}
                />
              </TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Espacio de Atención</TableCell>
              <TableCell>Contratista</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Puntuación</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No se encontraron formularios
                </TableCell>
              </TableRow>
            ) : (
              forms.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((form) => {
                const isDuplicate = duplicates.some(dup => dup.id === form.id);
                return (
                  <TableRow 
                    key={form.id} 
                    hover 
                    sx={{ 
                      backgroundColor: isDuplicate ? '#fff3e0' : 'inherit',
                      '&:hover': { backgroundColor: isDuplicate ? '#ffe0b2' : 'inherit' }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedForms.includes(form.id)}
                        onChange={() => handleSelectForm(form.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {formatDate(form.fechaVisita)}
                    </TableCell>
                    <TableCell>
                      {form.espacioAtencion || 'N/A'}
                      {isDuplicate && (
                        <Chip 
                          label="Duplicado" 
                          size="small" 
                          color="warning" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {form.contratista || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {form.userEmail || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {form.puntajeTotal || 0}
                      <br />
                      <Typography variant="caption">
                        ({form.porcentajeCumplimiento || 0}%)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={form.isComplete ? 'Finalizado' : 'Borrador'}
                        size="small"
                        color={form.isComplete ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalles">
                        <IconButton onClick={() => handleViewForm(form)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton 
                          onClick={() => {
                            setSelectedForm(form);
                            setDeleteDialogOpen(true);
                          }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalForms}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />

      {/* Diálogo para ver formulario */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalles del Formulario
        </DialogTitle>
        <DialogContent>
          {selectedForm && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">ID:</Typography>
                <Typography variant="body2" gutterBottom>{selectedForm.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Fecha:</Typography>
                <Typography variant="body2" gutterBottom>
                  {formatDate(selectedForm.fechaVisita)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Espacio de Atención:</Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedForm.espacioAtencion || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Contratista:</Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedForm.contratista || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Apoyo Supervisión:</Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedForm.apoyoSupervision || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">PM Asistentes:</Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedForm.pmAsistentes || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Puntuación Total:</Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedForm.puntajeTotal || 0} ({selectedForm.porcentajeCumplimiento || 0}%)
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Usuario:</Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedForm.userEmail || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Tipo de Espacio:</Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedForm.tipoEspacio === 'cdvfijo' ? 'Centro de Vida Fijo' : 
                   selectedForm.tipoEspacio === 'cdvparque' ? 'Centro de Vida Parque/Espacio Comunitario' : 
                   selectedForm.tipoEspacio || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para eliminar formulario individual */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de que desea eliminar este formulario?
          </Typography>
          {selectedForm && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Espacio:</strong> {selectedForm.espacioAtencion}<br />
              <strong>Fecha:</strong> {formatDate(selectedForm.fechaVisita)}<br />
              <strong>Usuario:</strong> {selectedForm.userEmail}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => handleDeleteForm(selectedForm.id)} 
            color="error"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para eliminación masiva */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación Masiva</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de que desea eliminar {selectedForms.length} formularios seleccionados?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleBulkDelete} 
            color="error"
            variant="contained"
          >
            Eliminar Todos
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormsManagement;