import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Container, Box, Button, Snackbar, Alert, Typography, Tab, Tabs, Paper } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import HeaderForm from './components/HeaderForm';
import ChecklistSection from './components/ChecklistSection';
import SignatureCapture from './components/SignatureCapture';
import Observations from './components/Observations';
import PhotoCapture from './components/PhotoCapture';
import SavedForms from './components/SavedForms';
import GeoLocationCapture from './components/GeoLocationCapture';
import checklistData from './data';
import theme from './theme';
import './components/ChecklistItem.css';

import { 
    saveFormToLocalStorage, 
    getFormFromLocalStorage, 
    markFormAsComplete,
    cleanupOldForms
} from './services/localStorageService';

function App() {
    // Estado para controlar el modo de visualización (formulario o lista de guardados)
    const [viewMode, setViewMode] = useState('form'); // 'form' o 'saved'
    
    // Estados para los diferentes componentes
    const [headerData, setHeaderData] = useState({});
    const [signatures, setSignatures] = useState({
        'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
        'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
    });
    const [generalObservations, setGeneralObservations] = useState('');
    const [checklistSectionsData, setChecklistSectionsData] = useState({});
    const [photos, setPhotos] = useState([]);
    const [geoLocation, setGeoLocation] = useState({});
    
    // Estado para el formulario actual
    const [currentFormId, setCurrentFormId] = useState(null);
    const [formChanged, setFormChanged] = useState(false);
    
    // Estado para notificaciones
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    
    // Limpiar formularios antiguos al inicio
    useEffect(() => {
        cleanupOldForms();
    }, []);
    
    // Efecto para autoguardado
    useEffect(() => {
        if (formChanged) {
            const autoSaveTimer = setTimeout(() => {
                saveCurrentForm();
            }, 5000); // Autoguardar después de 5 segundos de inactividad
            
            return () => clearTimeout(autoSaveTimer);
        }
    }, [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, formChanged]);
    
    // Efecto para registrar cambios en los datos
    useEffect(() => {
        setFormChanged(true);
    }, [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation]);
    
    // Guardar el formulario actual
    const saveCurrentForm = () => {
        if (!formChanged) return;
        
        const formData = {
            headerData,
            signatures,
            generalObservations,
            checklistSectionsData,
            photos,
            geoLocation
        };
        
        const savedId = saveFormToLocalStorage(formData, currentFormId);
        if (savedId && currentFormId !== savedId) {
            setCurrentFormId(savedId);
        }
        
        setFormChanged(false);
        
        // Mostrar notificación
        setNotification({
            open: true,
            message: 'Formulario guardado automáticamente',
            severity: 'success'
        });
    };
    
    // Cargar un formulario guardado
    const loadSavedForm = (formId) => {
        // Si no hay ID, crear un nuevo formulario
        if (!formId) {
            resetForm();
            setViewMode('form');
            return;
        }
        
        const savedForm = getFormFromLocalStorage(formId);
        if (savedForm && savedForm.data) {
            const { data } = savedForm;
            
            // Cargar todos los datos del formulario
            setHeaderData(data.headerData || {});
            setSignatures(data.signatures || {
                'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
                'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
            });
            setGeneralObservations(data.generalObservations || '');
            setChecklistSectionsData(data.checklistSectionsData || {});
            setPhotos(data.photos || []);
            setGeoLocation(data.geoLocation || {});
            
            // Actualizar el ID del formulario actual
            setCurrentFormId(formId);
            setFormChanged(false);
            
            // Cambiar al modo formulario
            setViewMode('form');
            
            // Notificar al usuario
            setNotification({
                open: true,
                message: 'Formulario cargado correctamente',
                severity: 'success'
            });
        } else {
            setNotification({
                open: true,
                message: 'No se pudo cargar el formulario',
                severity: 'error'
            });
        }
    };
    
    // Resetear el formulario
    const resetForm = () => {
        setHeaderData({});
        setSignatures({
            'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
            'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
        });
        setGeneralObservations('');
        setChecklistSectionsData({});
        setPhotos([]);
        setGeoLocation({});
        setCurrentFormId(null);
        setFormChanged(false);
    };
    
    // Cerrar notificación
    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };
    
    useEffect(() => {
        console.log('Checklist Sections Data updated:', checklistSectionsData);
    }, [checklistSectionsData]);

    // Manejadores para actualizar los estados
    const handleHeaderDataChange = (data) => setHeaderData(data);
    
    const handleSignatureChange = (role, signatureData, checked) => {
        // Normalizar el rol a minúsculas para evitar duplicados por mayúsculas/minúsculas
        const normalizedRole = role.toLowerCase();
        setSignatures(prev => ({ ...prev, [normalizedRole]: { data: signatureData, checked } }));
    };
    
    const handleObservationsChange = (observations) => setGeneralObservations(observations);
    
    const handlePhotosChange = (newPhotos) => {
        console.log('Fotos actualizadas:', newPhotos);
        setPhotos(newPhotos);
    };
    
    const handleGeoLocationChange = (location) => {
        setGeoLocation(location);
        setFormChanged(true);
    };
    
    const handleSectionDataChange = (sectionTitle, sectionData) => {
        setChecklistSectionsData(prevState => ({
            ...prevState,
            [sectionTitle]: {
                ...prevState[sectionTitle],
                ...sectionData(prevState[sectionTitle] || {})
            }
        }));
    };

    const generateTableData = () => {
        const tableRows = [];

        checklistData.forEach((section) => {
            tableRows.push([{ 
                content: section.title, 
                colSpan: 2, 
                styles: { 
                    fillColor: [30, 136, 229], 
                    textColor: 255, 
                    fontStyle: 'bold', 
                    halign: 'left',
                    fontSize: 11,
                    cellPadding: 8
                } 
            }]);
            tableRows.push([
                { 
                    content: 'Criterio', 
                    styles: { 
                        fontStyle: 'bold', 
                        halign: 'left', 
                        fillColor: [240, 240, 240], 
                        cellWidth: 150,
                        fontSize: 10
                    } 
                },
                { 
                    content: 'Condición', 
                    styles: { 
                        fontStyle: 'bold', 
                        halign: 'left', 
                        fillColor: [240, 240, 240], 
                        cellWidth: 40,
                        fontSize: 10
                    } 
                }
            ]);

            section.items.forEach(item => {
                const itemData = checklistSectionsData[section.title]?.[item.id] || {};
                const displayValue = itemData.displayText || 'N/A';

                tableRows.push([
                    { 
                        content: `${item.number}. ${item.label}`, 
                        styles: { 
                            fontStyle: 'normal', 
                            cellWidth: 150,
                            fontSize: 10,
                            cellPadding: 5
                        } 
                    },
                    { 
                        content: displayValue, 
                        styles: { 
                            halign: 'left', 
                            cellWidth: 40,
                            fontSize: 10,
                            cellPadding: 5
                        } 
                    }
                ]);
            });
        });

        return tableRows;
    };

    const generatePdf = () => {
        // Guardar el formulario como completo antes de generar el PDF
        if (currentFormId) {
            markFormAsComplete(currentFormId);
        }
        
        const doc = new jsPDF();
        let currentY = 20; // Variable para controlar la posición vertical actual
        
        // Encabezado con texto estilizado
        doc.setFillColor(12, 35, 64); // Color azul oscuro institucional
        doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
        
        // Texto del encabezado
        doc.setTextColor(255, 255, 255); // Texto blanco
        doc.setFontSize(16).setFont('helvetica', 'bold');
        doc.text('ALCALDÍA DE BARRANQUILLA', 105, 15, { align: 'center' });
        
        // Texto adicional
        doc.setFontSize(10).setFont('helvetica', 'normal');
        doc.text('NIT: 890102018-1', 105, 22, { align: 'center' });
        
        // Ajustar posición inicial
        currentY += 15;
        
        // Título del reporte
        doc.setTextColor(0, 0, 0); // Texto negro
        doc.setFontSize(16).setFont('helvetica', 'bold').text('Reporte de Supervisión - Centros de Vida', 105, currentY, { align: 'center' });
        currentY += 10;

        doc.setFontSize(12).setFont('helvetica', 'normal');

        const headerRows = [
            ['Fecha de Visita', headerData.fechaVisita || 'N/A'],
            ['Hora de Visita', headerData.horaVisita || 'N/A'],
            ['Espacio de Atención', headerData.espacioAtencion || 'N/A'],
            ['Número de Visita', headerData.numeroVisita || 'N/A'],
            ['Entidad Contratista', headerData.entidadContratista || 'N/A'],
            ['NIT', headerData.nit || 'N/A'],
            ['Nombre Representante Legal', headerData.nombreRepresentante || 'N/A'],
            ['Nombre Profesional quien atiende la visita', headerData.nombreProfesional || 'N/A'],
            ['Número de Contrato', headerData.numeroContrato || 'N/A'],
            ['PM Asistentes', headerData.pmAsistentes || 'N/A'],
            ['Anexos', headerData.anexos || 'N/A'],
            ['Nombre Supervisor', headerData.nombreSupervisor || 'N/A']
        ];

        // Tabla de datos de la visita
        doc.autoTable({ 
            head: [['Datos de la Visita', 'Información']], 
            body: headerRows, 
            startY: currentY, 
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [30, 136, 229],
                textColor: 255,
                fontSize: 11
            }
        });
        
        currentY = doc.lastAutoTable.finalY + 10;
        
        // Añadir información de geolocalización si está disponible
        if (geoLocation && (geoLocation.latitude || geoLocation.longitude)) {
            // Verificar si hay suficiente espacio para la sección
            if (currentY + 60 > doc.internal.pageSize.height - 20) {
                doc.addPage();
                currentY = 20;
            }
            
            // Tabla para la geolocalización
            const geoRows = [];
            
            if (geoLocation.latitude && geoLocation.longitude) {
                geoRows.push(['Latitud', geoLocation.latitude.toFixed(6)]);
                geoRows.push(['Longitud', geoLocation.longitude.toFixed(6)]);
            }
            
            if (geoLocation.accuracy) {
                geoRows.push(['Precisión', `±${geoLocation.accuracy.toFixed(0)} metros`]);
            }
            
            if (geoLocation.timestamp) {
                geoRows.push(['Registrado', new Date(geoLocation.timestamp).toLocaleString()]);
            }
            
            if (geoLocation.address) {
                geoRows.push(['Dirección aproximada', geoLocation.address]);
            }
            
            if (geoRows.length > 0) {
                doc.autoTable({
                    head: [['Georreferenciación de la Visita', 'Datos']],
                    body: geoRows,
                    startY: currentY,
                    theme: 'grid',
                    styles: {
                        fontSize: 10,
                        cellPadding: 5
                    },
                    headStyles: {
                        fillColor: [30, 136, 229],
                        textColor: 255,
                        fontSize: 11
                    },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        1: { cellWidth: 'auto' }
                    }
                });
                
                currentY = doc.lastAutoTable.finalY + 10;
            }
        }

        // Tabla de checklist
        doc.autoTable({ 
            body: generateTableData(), 
            startY: currentY, 
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            }
        });
        
        currentY = doc.lastAutoTable.finalY + 10;

        // Verificar si queda suficiente espacio para observaciones y firmas
        const requiredSpace = 20 + (Object.keys(signatures).length * 50) + (generalObservations ? 30 : 0);
        
        // Si no hay suficiente espacio, añadir una nueva página
        if (currentY + requiredSpace > doc.internal.pageSize.height - 20) {
            doc.addPage();
            currentY = 20;
        }

        // Sección de firmas
        doc.setFontSize(12).setFont('helvetica', 'bold').text('Firmas:', 10, currentY);
        currentY += 10;

        // Procesar cada firma normalizando los nombres de roles para evitar duplicados
        const signatureRoles = Object.keys(signatures).map(role => role.toLowerCase());
        
        // Eliminar duplicados usando un Set
        const uniqueRoles = [...new Set(signatureRoles)];
        
        for (let i = 0; i < uniqueRoles.length; i++) {
            const role = uniqueRoles[i];
            
            // Verificar si hay suficiente espacio para la firma en la página actual
            if (currentY + 50 > doc.internal.pageSize.height - 20) {
                doc.addPage();
                currentY = 20;
            }
            
            // Formatear el texto del rol para mostrar con la primera letra en mayúscula
            const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
            
            if (signatures[role]?.data) {
                doc.addImage(signatures[role].data, 'PNG', 10, currentY, 50, 30);
                doc.text(`Firma de ${displayRole}`, 10, currentY + 40);
            } else {
                doc.text(`Firma de ${displayRole}: No firmado`, 10, currentY);
            }
            
            currentY += 50; // Espacio para cada firma
        }

        // Observaciones generales
        if (generalObservations) {
            // Verificar si hay suficiente espacio para las observaciones
            if (currentY + 30 > doc.internal.pageSize.height - 20) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.setFontSize(12).setFont('helvetica', 'bold').text('Observaciones Generales:', 10, currentY);
            currentY += 7;
            
            doc.setFont('helvetica', 'normal').text(
                doc.splitTextToSize(generalObservations, 190), 
                10, 
                currentY
            );
            
            currentY += 20; // Espacio después de las observaciones
        }
        
        // Agregar evidencia fotográfica al PDF si hay fotos
        if (photos && photos.length > 0) {
            // Verificar si hay suficiente espacio para el título de la sección
            if (currentY + 30 > doc.internal.pageSize.height - 20) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.setFontSize(12).setFont('helvetica', 'bold').text('Evidencia Fotográfica:', 10, currentY);
            currentY += 10;
            
            // Añadir cada foto con su descripción
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                
                // Verificar si hay suficiente espacio para la foto
                if (currentY + 110 > doc.internal.pageSize.height - 20) {
                    doc.addPage();
                    currentY = 20;
                }
                
                // Añadir imagen
                try {
                    doc.addImage(photo.preview, 'JPEG', 10, currentY, 80, 80);
                    
                    // Añadir descripción y fecha
                    doc.setFontSize(10).setFont('helvetica', 'bold');
                    doc.text(`Foto ${i + 1}:`, 100, currentY + 10);
                    
                    doc.setFontSize(10).setFont('helvetica', 'normal');
                    const lines = doc.splitTextToSize(photo.description || 'Sin descripción', 90);
                    doc.text(lines, 100, currentY + 20);
                    
                    // Añadir fecha
                    const photoDate = new Date(photo.timestamp);
                    const formattedDate = `${photoDate.toLocaleDateString()} ${photoDate.toLocaleTimeString()}`;
                    doc.text(`Fecha: ${formattedDate}`, 100, currentY + 40 + (lines.length * 5));
                    
                    currentY += 90; // Espacio para la siguiente foto
                } catch (error) {
                    console.error('Error al agregar la imagen al PDF:', error);
                    
                    // En caso de error, añadir texto indicando el problema
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(`[No se pudo incluir la foto ${i + 1}]`, 10, currentY);
                    currentY += 15;
                }
            }
        }
        
        // Agregar pie de página a todas las páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Línea separadora
            doc.setDrawColor(12, 35, 64);
            doc.line(10, doc.internal.pageSize.height - 20, doc.internal.pageSize.width - 10, doc.internal.pageSize.height - 20);
            
            // Texto del pie de página
            doc.setFontSize(8).setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text('Calle 34 No. 43-31. Barranquilla.Colombia', 105, doc.internal.pageSize.height - 15, { align: 'center' });
            doc.text('BARRANQUILLA.GOV.CO', 105, doc.internal.pageSize.height - 10, { align: 'center' });
            
            // Número de página
            doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        }

        doc.save('reporte-supervision.pdf');
    };

    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="lg">
                {/* Pestañas para alternar entre formulario y formularios guardados */}
                <Paper sx={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <Tabs 
                        value={viewMode} 
                        onChange={(e, newValue) => {
                            // Guardar el formulario actual antes de cambiar de vista
                            if (formChanged && viewMode === 'form') {
                                saveCurrentForm();
                            }
                            setViewMode(newValue);
                        }}
                        centered
                    >
                        <Tab label="Formulario Actual" value="form" />
                        <Tab label="Formularios Guardados" value="saved" />
                    </Tabs>
                </Paper>
                
                {/* Mostrar el título con información del formulario actual */}
                {viewMode === 'form' && (
                    <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
                        <Typography variant="h5">
                            {currentFormId ? 'Editando Formulario' : 'Nuevo Formulario'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {currentFormId 
                                ? `ID: ${currentFormId.substring(0, 8)}... - Se guarda automáticamente` 
                                : 'Los cambios se guardarán automáticamente'}
                        </Typography>
                    </Box>
                )}
                
                {viewMode === 'form' ? (
                    <Box sx={{ py: 4 }}>
                        <HeaderForm 
                            onDataChange={handleHeaderDataChange} 
                            initialData={headerData}
                        />
                        
                        <GeoLocationCapture 
                            onLocationChange={handleGeoLocationChange} 
                            initialData={geoLocation}
                        />
                        
                        {checklistData.map((section) => (
                            <ChecklistSection 
                                key={section.title} 
                                title={section.title} 
                                items={section.items} 
                                onSectionDataChange={handleSectionDataChange}
                                initialData={checklistSectionsData[section.title]} 
                            />
                        ))}
                        <SignatureCapture 
                            label="apoyo a la supervisión quien realiza la visita" 
                            onSignatureChange={handleSignatureChange}
                            initialData={signatures['apoyo a la supervisión quien realiza la visita']} 
                        />
                        <SignatureCapture 
                            label="profesional/técnico del contratista quien atiende la visita" 
                            onSignatureChange={handleSignatureChange}
                            initialData={signatures['profesional/técnico del contratista quien atiende la visita']} 
                        />
                        <Observations 
                            onObservationsChange={handleObservationsChange}
                            initialData={generalObservations}
                        />
                        <PhotoCapture 
                            onPhotosChange={handlePhotosChange}
                            initialData={photos}
                        />
                        <Box sx={{ mt: 3, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 2 }}>
                            <Button 
                                variant="contained" 
                                onClick={generatePdf} 
                                sx={{ padding: '10px 30px', fontSize: '1.1rem' }}
                            >
                                Generar PDF
                            </Button>
                            <Button 
                                variant="outlined" 
                                onClick={saveCurrentForm} 
                                sx={{ padding: '10px 30px', fontSize: '1.1rem' }}
                                disabled={!formChanged}
                            >
                                Guardar
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <SavedForms onLoadForm={loadSavedForm} />
                )}
                
                {/* Notificaciones */}
                <Snackbar 
                    open={notification.open} 
                    autoHideDuration={4000} 
                    onClose={handleCloseNotification}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert onClose={handleCloseNotification} severity={notification.severity}>
                        {notification.message}
                    </Alert>
                </Snackbar>
            </Container>
        </ThemeProvider>
    );
}

export default App;