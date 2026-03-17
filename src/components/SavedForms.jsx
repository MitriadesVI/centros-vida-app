import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Divider,
  Paper,
  Alert,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

// << 1. IMPORTACIONES ACTUALIZADAS
import { getAllForms, deleteForm } from '../services/dbService';

/**
 * Componente para gestionar formularios guardados localmente
 * @param {Function} onLoadForm - Función para cargar un formulario guardado
 */
const SavedForms = ({ onLoadForm }) => {
  const [savedForms, setSavedForms] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null); // Este estado se puede mantener para futuras métricas

  // Cargar la lista de formularios guardados
  useEffect(() => {
    loadSavedForms();
  }, []);

  // << 2. FUNCIÓN DE CARGA AHORA ES ASYNC
  const loadSavedForms = async () => {
    const forms = await getAllForms();
    setSavedForms(forms);
  };

  // Formatear la fecha para mostrar
  const formatDate = (isoString) => {
    if (!isoString) return 'Fecha desconocida';
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Abrir diálogo de confirmación para eliminar
  const handleConfirmDelete = (form) => {
    setSelectedForm(form);
    setOpenDialog(true);
  };

  // << 3. FUNCIÓN DE ELIMINACIÓN AHORA ES ASYNC
  const handleDeleteForm = async () => {
    if (selectedForm) {
      await deleteForm(selectedForm.id);
      loadSavedForms(); // Recargar la lista
      setOpenDialog(false);
      setSelectedForm(null);
    }
  };

  // Cargar un formulario guardado
  const handleLoadForm = (formId) => {
    if (onLoadForm) {
      onLoadForm(formId);
    }
  };

  const getLocalStatusLabel = (status) => {
    switch (status) {
      case 'borrador':
        return 'Borrador';
      case 'finalizado':
        return 'Finalizado';
      case 'sincronizado':
        return 'Sincronizado';
      default:
        return 'Desconocido';
    }
  };

  const getLocalStatusColor = (status) => {
    switch (status) {
      case 'borrador':
        return 'warning';
      case 'finalizado':
        return 'info';
      case 'sincronizado':
        return 'success';
      default:
        return 'default';
    }
  };

  const resolveSyncStatus = (form) => {
    if (form.syncStatus) return form.syncStatus;
    if (form.status === 'sincronizado') return 'synced';
    return 'pending_sync';
  };

  const getSyncStatusLabel = (syncStatus) => {
    switch (syncStatus) {
      case 'pending_sync':
        return 'Pendiente de sincronizar';
      case 'synced':
        return 'Sincronizado';
      case 'sync_error':
        return 'Error de sincronización';
      default:
        return 'Sin estado';
    }
  };

  const getSyncStatusColor = (syncStatus) => {
    switch (syncStatus) {
      case 'pending_sync':
        return 'warning';
      case 'synced':
        return 'success';
      case 'sync_error':
        return 'error';
      default:
        return 'default';
    }
  };

  // Renderizar mensaje cuando no hay formularios
  const renderEmptyState = () => (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <Typography variant="body1" color="textSecondary">
        No hay formularios guardados.
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        Los borradores que guardes aparecerán aquí.
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Formularios Guardados
      </Typography>
      
      <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
        {savedForms.length > 0 ? (
          <List>
            {savedForms.map((form) => (
              <React.Fragment key={form.id}>
                <ListItem>
                  <ListItemText
                    primary={`Visita: ${form.headerData?.espacioAtencion || 'Sin ubicación'}`}
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography component="span" variant="body2" color="textPrimary">
                          {`Última actualización: ${formatDate(form.lastUpdated)}`}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                          <Chip
                            size="small"
                            label={`Local: ${getLocalStatusLabel(form.status)}`}
                            color={getLocalStatusColor(form.status)}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Sync: ${getSyncStatusLabel(resolveSyncStatus(form))}`}
                            color={getSyncStatusColor(resolveSyncStatus(form))}
                            variant={resolveSyncStatus(form) === 'synced' ? 'filled' : 'outlined'}
                          />
                        </Box>
                        {form.lastSyncError && (
                          <Typography component="div" variant="caption" color="error" sx={{ mt: 0.5 }}>
                            {`Detalle: ${form.lastSyncError}`}
                          </Typography>
                        )}
                        {form.remoteDocId && (
                          <Typography component="div" variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {`ID remoto: ${form.remoteDocId}`}
                          </Typography>
                        )}
                        {form.lastSyncedAt && (
                          <Typography component="div" variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {`Última sincronización: ${formatDate(form.lastSyncedAt)}`}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="edit"
                      onClick={() => handleLoadForm(form.id)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleConfirmDelete(form)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        ) : (
          renderEmptyState()
        )}
      </Paper>

      {/* Alerta de espacio de almacenamiento si está casi lleno (lógica a futuro) */}
      {storageInfo && storageInfo.usedPercentage > 70 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          El almacenamiento local está casi lleno. Considere sincronizar y eliminar formularios antiguos.
        </Alert>
      )}

      {/* Botón para crear un nuevo formulario */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => onLoadForm(null)}
          sx={{ mx: 1 }}
        >
          Nuevo Formulario
        </Button>
      </Box>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de que desea eliminar este borrador? Esta acción no se puede deshacer.
          </Typography>
          {selectedForm && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Visita: {selectedForm.headerData?.espacioAtencion || 'Sin ubicación'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteForm} color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedForms;
