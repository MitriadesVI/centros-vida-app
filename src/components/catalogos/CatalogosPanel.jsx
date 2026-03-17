import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import {
  getEspacios,
  addEspacio,
  updateEspacio,
  deleteEspacio,
  importarEspaciosCSV
} from '../../services/catalogService';

const TIPOS_VALIDOS = ['cdvfijo', 'cdvparque'];
const TIPO_DEFAULT = 'cdvfijo';

const parsearCSV = (texto) => {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lineas.length < 2) return [];

  // Detectar separador: punto y coma o coma
  const separador = lineas[0].includes(';') ? ';' : ',';
  const encabezados = lineas[0].split(separador).map(h => h.trim().toLowerCase());

  const idxNombre = encabezados.indexOf('nombre');
  const idxTipo = encabezados.indexOf('tipo');

  if (idxNombre === -1) return null; // encabezado requerido ausente

  return lineas.slice(1).reduce((acc, linea) => {
    const cols = linea.split(separador).map(c => c.trim());
    const nombre = cols[idxNombre] || '';
    const tipo = idxTipo !== -1 ? cols[idxTipo] : '';
    if (!nombre) return acc;
    acc.push({
      nombre,
      tipo: TIPOS_VALIDOS.includes(tipo) ? tipo : TIPO_DEFAULT
    });
    return acc;
  }, []);
};

const TIPO_LABELS = {
  cdvfijo: 'Centro de Vida Fijo',
  cdvparque: 'Centro de Vida Parque/Espacio Comunitario'
};

const emptyForm = { nombre: '', tipo: 'cdvfijo' };

const CatalogosPanel = () => {
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog estado
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Dialog confirmación eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Importación CSV
  const csvInputRef = useRef(null);
  const [csvPreview, setCsvPreview] = useState(null); // array de espacios parseados
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadEspacios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEspacios();
      setEspacios(data);
    } catch (e) {
      setError('Error al cargar los espacios. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEspacios();
  }, [loadEspacios]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormValues(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (espacio) => {
    setEditingId(espacio.id);
    setFormValues({ nombre: espacio.nombre, tipo: espacio.tipo });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formValues.nombre.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateEspacio(editingId, { nombre: formValues.nombre.trim(), tipo: formValues.tipo });
      } else {
        await addEspacio({ nombre: formValues.nombre.trim(), tipo: formValues.tipo });
      }
      await loadEspacios();
      handleCloseDialog();
    } catch (e) {
      setError('Error al guardar el espacio.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (espacio) => {
    try {
      await updateEspacio(espacio.id, { activo: !espacio.activo });
      await loadEspacios();
    } catch (e) {
      setError('Error al actualizar el estado.');
    }
  };

  const handleOpenDelete = (id) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteEspacio(deletingId);
      await loadEspacios();
    } catch (e) {
      setError('Error al eliminar el espacio.');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleCSVFileChange = (e) => {
    const file = e.target.files[0];
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const resultado = parsearCSV(ev.target.result);
      if (resultado === null) {
        setError('El CSV no tiene la columna "nombre" requerida en la primera fila.');
        return;
      }
      if (resultado.length === 0) {
        setError('El CSV no contiene filas de datos válidas.');
        return;
      }
      setCsvPreview(resultado);
      setCsvDialogOpen(true);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    if (!csvPreview) return;
    setImporting(true);
    try {
      await importarEspaciosCSV(csvPreview);
      await loadEspacios();
      setCsvDialogOpen(false);
      setCsvPreview(null);
    } catch (e) {
      setError('Error al importar los espacios. Verifica tu conexión.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          Catálogo de Espacios de Atención
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={handleCSVFileChange}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => csvInputRef.current?.click()}
          >
            Importar CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
          >
            Añadir Espacio
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Estado</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {espacios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay espacios registrados. Añade el primero.
                  </TableCell>
                </TableRow>
              ) : (
                espacios.map((espacio) => (
                  <TableRow key={espacio.id} hover>
                    <TableCell>{espacio.nombre}</TableCell>
                    <TableCell>{TIPO_LABELS[espacio.tipo] || espacio.tipo}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={espacio.activo ? 'Activo' : 'Inactivo'}
                        color={espacio.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenEdit(espacio)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={espacio.activo ? 'Desactivar' : 'Activar'}>
                        <IconButton size="small" onClick={() => handleToggleActivo(espacio)}>
                          {espacio.activo ? <ToggleOnIcon fontSize="small" color="success" /> : <ToggleOffIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleOpenDelete(espacio.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog: Añadir / Editar */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Espacio' : 'Añadir Espacio de Atención'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre del espacio"
            fullWidth
            value={formValues.nombre}
            onChange={(e) => setFormValues(prev => ({ ...prev, nombre: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth>
            <InputLabel>Tipo de espacio</InputLabel>
            <Select
              value={formValues.tipo}
              label="Tipo de espacio"
              onChange={(e) => setFormValues(prev => ({ ...prev, tipo: e.target.value }))}
            >
              <MenuItem value="cdvfijo">Centro de Vida Fijo</MenuItem>
              <MenuItem value="cdvparque">Centro de Vida Parque/Espacio Comunitario</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formValues.nombre.trim()}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Eliminar Espacio</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar este espacio? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar importación CSV */}
      <Dialog open={csvDialogOpen} onClose={() => !importing && setCsvDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar espacios desde CSV</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se encontraron <strong>{csvPreview?.length ?? 0}</strong> espacio(s) en el archivo. ¿Desea importarlos?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCsvDialogOpen(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} /> : null}
          >
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CatalogosPanel;
