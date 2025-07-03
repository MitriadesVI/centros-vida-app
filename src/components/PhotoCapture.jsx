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
  DialogActions,
  ButtonGroup
} from '@mui/material';
import { 
  CameraAlt as CameraIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Close as CloseIcon,
  PhotoLibrary as GalleryIcon
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
  
  // Referencias separadas para cámara y galería
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  
  // Notificar al padre cuando cambien las fotos
  useEffect(() => {
    onPhotosChange(photos);
  }, [photos, onPhotosChange]);
  
  // Manejador para la captura desde cámara
  const handleCameraCapture = (event) => {
    const files = event.target.files;
    if (files && files[0]) {
      const newPhoto = {
        id: Date.now(),
        file: files[0],
        preview: URL.createObjectURL(files[0]),
        description: '',
        timestamp: new Date().toISOString(),
        source: 'camera' // Marcamos el origen
      };
      
      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      
      // Reiniciar el input para permitir seleccionar la misma imagen
      event.target.value = null;
    }
  };

  // Manejador para la selección desde galería
  const handleGallerySelection = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Permitir selección múltiple desde galería
      const newPhotos = Array.from(files).map(file => ({
        id: Date.now() + Math.random(), // ID único para cada foto
        file: file,
        preview: URL.createObjectURL(file),
        description: '',
        timestamp: new Date().toISOString(),
        source: 'gallery' // Marcamos el origen
      }));
      
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      
      // Reiniciar el input
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
      setCurrentDescription('');
    }
  };
  
  // Eliminar foto
  const handleDeletePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    
    // Revocamos la URL del objeto para evitar fugas de memoria
    URL.revokeObjectURL(photos[index].preview);
    
    setPhotos(updatedPhotos);
  };
  
  // Activar captura de cámara
  const triggerCameraCapture = () => {
    cameraInputRef.current.click();
  };

  // Activar selección de galería
  const triggerGallerySelection = () => {
    galleryInputRef.current.click();
  };
  
  // Formatear la fecha para mostrar
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Obtener el ícono según el origen de la foto
  const getSourceIcon = (source) => {
    return source === 'camera' ? '📷' : '🖼️';
  };

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Evidencia Fotográfica
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <ButtonGroup variant="contained" sx={{ mr: 2 }}>
          <Button
            startIcon={<CameraIcon />}
            onClick={triggerCameraCapture}
          >
            Tomar Foto
          </Button>
          <Button
            startIcon={<GalleryIcon />}
            onClick={triggerGallerySelection}
          >
            Seleccionar de Galería
          </Button>
        </ButtonGroup>
        
        {/* Input para captura de cámara */}
        <input
          ref={cameraInputRef}
          accept="image/*"
          type="file"
          capture="environment"
          onChange={handleCameraCapture}
          style={{ display: 'none' }}
        />
        
        {/* Input para selección de galería */}
        <input
          ref={galleryInputRef}
          accept="image/*"
          type="file"
          multiple
          onChange={handleGallerySelection}
          style={{ display: 'none' }}
        />
      </Box>

      {/* Mensaje informativo */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Puedes tomar fotos nuevas con la cámara o seleccionar múltiples fotos existentes de tu galería.
      </Typography>
      
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
                    {getSourceIcon(photo.source)} {formatDate(photo.timestamp)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    {photo.source === 'camera' ? 'Tomada con cámara' : 'Seleccionada de galería'}
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
      
      {/* Información del total de fotos */}
      {photos.length > 0 && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total de fotos: {photos.length} 
            {photos.some(p => p.source === 'camera') && ` | Tomadas: ${photos.filter(p => p.source === 'camera').length}`}
            {photos.some(p => p.source === 'gallery') && ` | De galería: ${photos.filter(p => p.source === 'gallery').length}`}
          </Typography>
        </Box>
      )}
      
      {/* Diálogo para editar descripción */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
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
            placeholder="Describe qué se muestra en esta foto..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSaveDescription} color="primary" variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoCapture;