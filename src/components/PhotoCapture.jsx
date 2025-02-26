import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography,
  Grid,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  CameraAlt as CameraIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Close as CloseIcon
} from '@mui/icons-material';

/**
 * Componente para capturar y gestionar fotos como evidencias
 * @param {Function} onPhotosChange - Función callback para actualizar las fotos en el componente padre
 * @param {Array} initialData - Datos iniciales de fotos precargadas
 */
const PhotoCapture = ({ onPhotosChange, initialData = [] }) => {
  const [photos, setPhotos] = useState(initialData);
  const [currentDescription, setCurrentDescription] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const fileInputRef = useRef(null);
  
  // Notificar al padre cuando cambien las fotos
  useEffect(() => {
    onPhotosChange(photos);
  }, [photos, onPhotosChange]);
  
  // Manejador para la captura desde cámara o selección de archivos
  const handleCapture = (event) => {
    const files = event.target.files;
    if (files && files[0]) {
      const newPhoto = {
        id: Date.now(),
        file: files[0],
        preview: URL.createObjectURL(files[0]),
        description: '',
        timestamp: new Date().toISOString()
      };
      
      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      
      // Reiniciar el input para permitir seleccionar la misma imagen
      event.target.value = null;
    }
  };
  
  // Abre el diálogo para editar descripción
  const handleEditDescription = (index) => {
    setEditIndex(index);
    setCurrentDescription(photos[index].description);
    setOpenDialog(true);
  };
  
  // Guardar descripción editada
  const handleSaveDescription = () => {
    if (editIndex !== null) {
      const updatedPhotos = [...photos];
      updatedPhotos[editIndex] = {
        ...updatedPhotos[editIndex],
        description: currentDescription
      };
      setPhotos(updatedPhotos);
      setOpenDialog(false);
      setEditIndex(null);
    }
  };
  
  // Eliminar foto
  const handleDeletePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    
    // Revocamos la URL del objeto para evitar fugas de memoria
    URL.revokeObjectURL(photos[index].preview);
    
    setPhotos(updatedPhotos);
  };
  
  // Activar el input de archivo para capturar fotos
  const triggerCapture = () => {
    fileInputRef.current.click();
  };
  
  // Formatear la fecha para mostrar
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Evidencia Fotográfica
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<CameraIcon />}
          onClick={triggerCapture}
          sx={{ mr: 2 }}
        >
          Capturar Foto
        </Button>
        
        <input
          ref={fileInputRef}
          accept="image/*"
          type="file"
          capture="environment"
          onChange={handleCapture}
          style={{ display: 'none' }}
        />
      </Box>
      
      {photos.length > 0 && (
        <Grid container spacing={2}>
          {photos.map((photo, index) => (
            <Grid item xs={12} sm={6} md={4} key={photo.id || index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={photo.preview}
                  alt={`Foto ${index + 1}`}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formatDate(photo.timestamp)}
                  </Typography>
                  <Typography variant="body2">
                    {photo.description || 'Sin descripción'}
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEditDescription(index)}
                    aria-label="editar descripción"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeletePhoto(index)}
                    aria-label="eliminar foto"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Diálogo para editar descripción */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          Agregar descripción
          <IconButton
            aria-label="cerrar"
            onClick={() => setOpenDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="description"
            label="Descripción de la foto"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={currentDescription}
            onChange={(e) => setCurrentDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDescription} color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoCapture;