import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Paper, 
    CircularProgress, 
    Alert, 
    Grid,
    Divider
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIcon from '@mui/icons-material/Map';

const GeoLocationCapture = ({ onLocationChange, initialData }) => {
    const [location, setLocation] = useState(initialData || {
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: null,
        address: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Función para obtener la ubicación
    const getLocation = () => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('La geolocalización no es compatible con este navegador.');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            // Éxito
            (position) => {
                const newLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                
                setLocation(newLocation);
                
                // Intentar obtener la dirección
                getAddressFromCoords(newLocation.latitude, newLocation.longitude);
                
                // Actualizar el mapa si está cargado
                if (mapLoaded) {
                    updateMap(newLocation.latitude, newLocation.longitude);
                }
                
                // Notificar al componente padre
                if (onLocationChange) {
                    onLocationChange(newLocation);
                }
                
                setLoading(false);
            },
            // Error
            (error) => {
                console.error('Error obteniendo la ubicación:', error);
                let errorMessage = 'Error al obtener la ubicación.';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Usuario denegó la solicitud de geolocalización.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'La información de ubicación no está disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Se agotó el tiempo para obtener la ubicación.';
                        break;
                    default:
                        errorMessage = 'Ocurrió un error desconocido.';
                        break;
                }
                
                setError(errorMessage);
                setLoading(false);
            },
            // Opciones
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Obtener dirección a partir de coordenadas
    const getAddressFromCoords = async (lat, lon) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'es'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Error al obtener la dirección');
            }
            
            const data = await response.json();
            
            if (data && data.display_name) {
                const updatedLocation = {
                    ...location,
                    latitude: lat,
                    longitude: lon,
                    address: data.display_name
                };
                
                setLocation(updatedLocation);
                
                // Notificar al componente padre
                if (onLocationChange) {
                    onLocationChange(updatedLocation);
                }
            }
        } catch (error) {
            console.error('Error obteniendo la dirección:', error);
            // No mostrar error al usuario, simplemente no se mostrará la dirección
        }
    };

    // Cargar y actualizar el mapa
    const loadMap = () => {
        if (!location.latitude || !location.longitude) return;
        
        // Crear iframe con un mapa de OpenStreetMap
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '200px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '4px';
        
        // URL del mapa con la ubicación
        iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01},${location.latitude - 0.01},${location.longitude + 0.01},${location.latitude + 0.01}&marker=${location.latitude},${location.longitude}&layers=M`;
        
        // Limpiar y añadir el iframe
        if (mapRef.current) {
            mapRef.current.innerHTML = '';
            mapRef.current.appendChild(iframe);
            setMapLoaded(true);
        }
    };

    // Actualizar el mapa existente
    const updateMap = (lat, lon) => {
        if (!mapRef.current) return;
        
        const iframe = mapRef.current.querySelector('iframe');
        if (iframe) {
            iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&marker=${lat},${lon}&layers=M`;
        } else {
            loadMap();
        }
    };

    // Cargar mapa al montar el componente o cuando se actualiza la ubicación
    useEffect(() => {
        if (location.latitude && location.longitude) {
            loadMap();
        }
    }, [location.latitude, location.longitude]);

    // Obtener ubicación al montar el componente si no hay datos iniciales
    useEffect(() => {
        if (!initialData || (!initialData.latitude && !initialData.longitude)) {
            getLocation();
        } else if (initialData && initialData.latitude && initialData.longitude) {
            setLocation(initialData);
        }
    }, []);

    return (
        <Paper elevation={2} sx={{ p: 2, mt: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ 
                display: 'flex', 
                alignItems: 'center',
                color: '#1976d2'
            }}>
                <LocationOnIcon sx={{ mr: 1 }} />
                Georreferenciación de la Visita
            </Typography>
            
            <Divider sx={{ my: 1 }} />
            
            {error && (
                <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MyLocationIcon />}
                            onClick={getLocation}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        >
                            {loading ? 'Obteniendo ubicación...' : (location.latitude ? 'Actualizar ubicación' : 'Obtener ubicación')}
                        </Button>
                        
                        <Box sx={{ 
                            p: 2, 
                            bgcolor: '#f5f5f5', 
                            borderRadius: 1, 
                            mt: 1 
                        }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Latitud:</strong> {location.latitude ? location.latitude.toFixed(6) : 'No disponible'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Longitud:</strong> {location.longitude ? location.longitude.toFixed(6) : 'No disponible'}
                            </Typography>
                            {location.accuracy && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Precisión:</strong> ±{location.accuracy.toFixed(0)} metros
                                </Typography>
                            )}
                            {location.timestamp && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Registrado:</strong> {new Date(location.timestamp).toLocaleString()}
                                </Typography>
                            )}
                            {location.address && (
                                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', fontSize: '0.9rem' }}>
                                    <strong>Dirección aproximada:</strong><br />
                                    {location.address}
                                </Typography>
                            )}
                        </Box>
                        
                        {location.latitude && location.longitude && (
                            <Button
                                variant="outlined"
                                startIcon={<MapIcon />}
                                onClick={() => window.open(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`, '_blank')}
                                sx={{ mt: 2 }}
                                size="small"
                                fullWidth
                            >
                                Ver en Google Maps
                            </Button>
                        )}
                    </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <Box 
                        ref={mapRef} 
                        sx={{ 
                            mt: 2, 
                            height: '200px', 
                            bgcolor: '#eee',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1
                        }}
                    >
                        {!location.latitude && !loading && (
                            <Typography variant="body2" color="textSecondary">
                                El mapa se mostrará cuando se obtenga la ubicación
                            </Typography>
                        )}
                        {loading && (
                            <CircularProgress size={30} />
                        )}
                    </Box>
                </Grid>
            </Grid>
            
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
                Esta información se incluirá automáticamente en el reporte generado.
            </Typography>
        </Paper>
    );
};

export default GeoLocationCapture;