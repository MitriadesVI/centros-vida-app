import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Container, Box, Button, Snackbar, Alert, Typography, Tab, Tabs, Paper } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Importación de los logos en base64
import { HEADER_LOGO, FOOTER_BANNER } from './assets/logoImages.js';

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
            // Añadir espacio antes de cada sección para mejorar la legibilidad
            tableRows.push([{ content: ' ', colSpan: 2, styles: { cellPadding: 3 } }]);
            
            // Encabezado de la sección con más espacio y mejor formato
            tableRows.push([{ 
                content: section.title.toUpperCase(), 
                colSpan: 2, 
                styles: { 
                    fillColor: [30, 136, 229], 
                    textColor: 255, 
                    fontStyle: 'bold', 
                    halign: 'center', // Centrar el título de sección
                    fontSize: 12,
                    cellPadding: 10, // Más espacio para el título de sección
                    cellWidth: 'auto'
                } 
            }]);
            
            // Encabezados de columna con más espacio
            tableRows.push([
                { 
                    content: 'Criterio', 
                    styles: { 
                        fontStyle: 'bold', 
                        halign: 'center', 
                        fillColor: [240, 240, 240], 
                        cellWidth: 140, // Ajustar ancho de la columna criterio
                        fontSize: 11,
                        cellPadding: 8
                    } 
                },
                { 
                    content: 'Condición', 
                    styles: { 
                        fontStyle: 'bold', 
                        halign: 'center', 
                        fillColor: [240, 240, 240], 
                        cellWidth: 50, // Ajustar ancho de la columna condición
                        fontSize: 11,
                        cellPadding: 8
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
                            halign: 'left',
                            cellWidth: 140,
                            fontSize: 10,
                            cellPadding: 6,
                            overflow: 'linebreak' // Asegurar que el texto se ajuste correctamente
                        } 
                    },
                    { 
                        content: displayValue, 
                        styles: { 
                            halign: 'center', // Centrar el valor de la condición
                            cellWidth: 50,
                            fontSize: 10,
                            cellPadding: 6
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
        
        // Crear documento PDF con más margen
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            margins: { top: 40, bottom: 40, left: 20, right: 20 }
        });
        
        // Función para estandarizar las cabeceras de tablas
        const standardTableHead = (title1, title2) => {
            return [[{ 
                content: title1, 
                styles: { 
                    halign: 'center',
                    fillColor: [30, 136, 229], 
                    textColor: 255, 
                    fontSize: 12,
                    fontStyle: 'bold'
                } 
            }, { 
                content: title2, 
                styles: { 
                    halign: 'center',
                    fillColor: [30, 136, 229], 
                    textColor: 255, 
                    fontSize: 12,
                    fontStyle: 'bold'
                } 
            }]]
        };
        
        // Definir márgenes para el contenido
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20; // Margen estándar de 20mm para todos los lados
        
        // Altura disponible para el contenido (restando espacio para encabezado y pie de página)
        const contentHeight = pageHeight - (margin * 2) - 35; // 35mm para encabezado y pie de página
        
        // Posición vertical inicial (después del encabezado)
        let currentY = 45; 
        
        // Título del reporte (solo en la primera página)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16).setFont('helvetica', 'bold').text('Reporte de Supervisión - Centros de Vida', pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;

        doc.setFontSize(12).setFont('helvetica', 'normal');

        // Datos actualizados según la nueva estructura del formulario
        const headerRows = [
            ['Fecha de Visita', headerData.fechaVisita || 'N/A'],
            ['Hora de Visita', headerData.horaVisita || 'N/A'],
            ['Espacio de Atención', headerData.espacioAtencion || 'N/A'],
            ['Apoyo a la supervisión quien realiza la visita', headerData.apoyoSupervision || 'N/A'],
            ['Personas mayores asistentes', headerData.pmAsistentes || 'N/A'],
            ['Contratista', headerData.entidadContratista || 'N/A'],
            ['NIT', headerData.nit || 'N/A'],
            ['No de contrato', headerData.numeroContrato || 'N/A'],
            ['Rep. Legal', headerData.nombreRepresentante || 'N/A'],
            ['Persona quien atiende la visita', headerData.nombreProfesional || 'N/A'],
            ['Supervisor del Distrito', headerData.nombreSupervisor || 'N/A']
        ];

        // Tabla de datos de la visita con mejor formato
        doc.autoTable({ 
            head: standardTableHead('Datos de la Visita', 'Información'), 
            body: headerRows, 
            startY: currentY, 
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 6,
                overflow: 'linebreak'
            },
            margin: { left: margin, right: margin },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 'auto' }
            }
        });
        
        currentY = doc.lastAutoTable.finalY + 15; // Más espacio después de la tabla
        
        // Añadir información de geolocalización si está disponible
        if (geoLocation && (geoLocation.latitude || geoLocation.longitude)) {
            // Verificar si hay suficiente espacio para la sección
            if (currentY + 80 > pageHeight - 40) {
                doc.addPage();
                currentY = 40; // Iniciar en una posición más baja en la nueva página
            }
            
            // Tabla para la geolocalización con mejor formato
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
                    head: standardTableHead('Georreferenciación de la Visita', 'Datos'),
                    body: geoRows,
                    startY: currentY,
                    theme: 'grid',
                    styles: {
                        fontSize: 10,
                        cellPadding: 6,
                        overflow: 'linebreak'
                    },
                    margin: { left: margin, right: margin },
                    columnStyles: {
                        0: { cellWidth: 80 },
                        1: { cellWidth: 'auto' }
                    }
                });
                
                currentY = doc.lastAutoTable.finalY + 15; // Más espacio después de la tabla
            }
        }

        // Tabla de checklist con mejor formato y márgenes
        doc.autoTable({ 
            body: generateTableData(), 
            startY: currentY,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 6,
                overflow: 'linebreak'
            },
            margin: { left: margin, right: margin },
            tableWidth: pageWidth - (margin * 2),
            didDrawPage: (data) => {
                // Añadir encabezado y pie de página en cada página nueva
                addHeaderAndFooter(doc);
            }
        });
        
        currentY = doc.lastAutoTable.finalY + 15; // Más espacio después de la tabla

        // Verificar si queda suficiente espacio para observaciones y firmas
        const requiredSpace = 30 + (Object.keys(signatures).length * 60) + (generalObservations ? 40 : 0);
        
        // Si no hay suficiente espacio, añadir una nueva página
        if (currentY + requiredSpace > pageHeight - 40) {
            doc.addPage();
            currentY = 40; // Iniciar en una posición más baja en la nueva página
            addHeaderAndFooter(doc); // Añadir encabezado y pie de página en la nueva página
        }

        // Sección de firmas con mejor formato
        doc.setFontSize(14).setFont('helvetica', 'bold').text('Firmas:', margin, currentY);
        currentY += 15;

        // Procesar cada firma normalizando los nombres de roles para evitar duplicados
        const signatureRoles = Object.keys(signatures).map(role => role.toLowerCase());
        
        // Eliminar duplicados usando un Set
        const uniqueRoles = [...new Set(signatureRoles)];
        
        for (let i = 0; i < uniqueRoles.length; i++) {
            const role = uniqueRoles[i];
            
            // Verificar si hay suficiente espacio para la firma en la página actual
            if (currentY + 50 > pageHeight - 40) {
                doc.addPage();
                currentY = 40; // Iniciar en una posición más baja en la nueva página
                addHeaderAndFooter(doc); // Añadir encabezado y pie de página en la nueva página
            }
            
            // Formatear el texto del rol para mostrar con la primera letra en mayúscula
            const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
            
            if (signatures[role]?.data) {
                doc.addImage(signatures[role].data, 'PNG', margin, currentY, 60, 40);
                doc.setFontSize(10).setFont('helvetica', 'normal');
                doc.text(`Firma de ${displayRole}`, margin, currentY + 50);
            } else {
                doc.setFontSize(10).setFont('helvetica', 'normal');
                doc.text(`Firma de ${displayRole}: No firmado`, margin, currentY + 10);
            }
            
            currentY += 60; // Más espacio para cada firma
        }

        // Observaciones generales con mejor formato
        if (generalObservations) {
            // Verificar si hay suficiente espacio para las observaciones
            if (currentY + 50 > pageHeight - 40) {
                doc.addPage();
                currentY = 40; // Iniciar en una posición más baja en la nueva página
                addHeaderAndFooter(doc); // Añadir encabezado y pie de página en la nueva página
            }
            
            doc.setFontSize(14).setFont('helvetica', 'bold').text('Observaciones Generales:', margin, currentY);
            currentY += 10;
            
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const textLines = doc.splitTextToSize(generalObservations, pageWidth - (margin * 2));
            doc.text(textLines, margin, currentY);
            
            currentY += (textLines.length * 7) + 15; // Espacio después de las observaciones
        }
        
        // Agregar evidencia fotográfica al PDF si hay fotos
        if (photos && photos.length > 0) {
            // Verificar si hay suficiente espacio para el título de la sección
            if (currentY + 40 > pageHeight - 40) {
                doc.addPage();
                currentY = 40; // Iniciar en una posición más baja en la nueva página
                addHeaderAndFooter(doc); // Añadir encabezado y pie de página en la nueva página
            }
            
            doc.setFontSize(14).setFont('helvetica', 'bold').text('Evidencia Fotográfica:', margin, currentY);
            currentY += 15;
            
            // Añadir cada foto con su descripción
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                
                // Verificar si hay suficiente espacio para la foto
                if (currentY + 110 > pageHeight - 40) {
                    doc.addPage();
                    currentY = 40; // Iniciar en una posición más baja en la nueva página
                    addHeaderAndFooter(doc); // Añadir encabezado y pie de página en la nueva página
                }
                
                // Añadir imagen
                try {
                    doc.addImage(photo.preview, 'JPEG', margin, currentY, 80, 80);
                    
                    // Añadir descripción y fecha
                    doc.setFontSize(11).setFont('helvetica', 'bold');
                    doc.text(`Foto ${i + 1}:`, margin + 90, currentY + 10);
                    
                    doc.setFontSize(10).setFont('helvetica', 'normal');
                    const lines = doc.splitTextToSize(photo.description || 'Sin descripción', pageWidth - margin - (margin + 90) - 10);
                    doc.text(lines, margin + 90, currentY + 20);
                    
                    // Añadir fecha
                    const photoDate = new Date(photo.timestamp);
                    const formattedDate = `${photoDate.toLocaleDateString()} ${photoDate.toLocaleTimeString()}`;
                    doc.text(`Fecha: ${formattedDate}`, margin + 90, currentY + 40 + (lines.length * 5));
                    
                    currentY += 95; // Espacio para la siguiente foto
                } catch (error) {
                    console.error('Error al agregar la imagen al PDF:', error);
                    
                    // En caso de error, añadir texto indicando el problema
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(`[No se pudo incluir la foto ${i + 1}]`, margin, currentY);
                    currentY += 15;
                }
            }
        }
        
        // Agregar encabezado y pie de página a todas las páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addHeaderAndFooter(doc);
        }

        doc.save('reporte-supervision.pdf');
    };
    
    // Función para añadir encabezado y pie de página
    const addHeaderAndFooter = (doc) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        try {
            // Encabezado con logo en todas las páginas - ajustado para que no ocupe tanto espacio
            doc.addImage(HEADER_LOGO, 'JPEG', 0, 0, pageWidth, 30);
            
            // Banner del pie de página - ajustado para que no interfiera con el contenido
            doc.addImage(FOOTER_BANNER, 'JPEG', 0, pageHeight - 20, pageWidth, 20);
        } catch (error) {
            console.error('Error al cargar las imágenes:', error);
            
            // Encabezado alternativo en caso de error
            doc.setFillColor(12, 35, 64);
            doc.rect(0, 0, pageWidth, 25, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text('ALCALDÍA DE BARRANQUILLA', pageWidth / 2, 15, { align: 'center' });
            
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text('NIT: 890102018-1', pageWidth / 2, 22, { align: 'center' });
            
            // Línea separadora para el pie de página en caso de error
            doc.setDrawColor(12, 35, 64);
            doc.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20);
            
            // Texto del pie de página
            doc.setFontSize(8).setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text('Calle 34 No. 43-31. Barranquilla.Colombia', pageWidth / 2, pageHeight - 15, { align: 'center' });
            doc.text('BARRANQUILLA.GOV.CO', pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
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

export default App