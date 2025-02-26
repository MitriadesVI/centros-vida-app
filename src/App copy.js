import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Container, Box, Button } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import HeaderForm from './components/HeaderForm';
import ChecklistSection from './components/ChecklistSection';
import SignatureCapture from './components/SignatureCapture';
import Observations from './components/Observations';
import PhotoCapture from './components/PhotoCapture';
import checklistData from './data';
import theme from './theme';
import './components/ChecklistItem.css';

function App() {
    // Estados para los diferentes componentes
    const [headerData, setHeaderData] = useState({});
    const [signatures, setSignatures] = useState({
        'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
        'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
    });
    const [generalObservations, setGeneralObservations] = useState('');
    const [checklistSectionsData, setChecklistSectionsData] = useState({});
    const [photos, setPhotos] = useState([]);

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
        const doc = new jsPDF();
        let currentY = 20; // Variable para controlar la posición vertical actual
        
        // Título del reporte
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
        const processedRoles = new Set();
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

        doc.save('reporte-supervision.pdf');
    };

    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="lg">
                <Box sx={{ py: 4 }}>
                    <HeaderForm onDataChange={handleHeaderDataChange} />
                    {checklistData.map((section) => (
                        <ChecklistSection 
                            key={section.title} 
                            title={section.title} 
                            items={section.items} 
                            onSectionDataChange={handleSectionDataChange} 
                        />
                    ))}
                    <SignatureCapture 
                        label="apoyo a la supervisión quien realiza la visita" 
                        onSignatureChange={handleSignatureChange} 
                    />
                    <SignatureCapture 
                        label="profesional/técnico del contratista quien atiende la visita" 
                        onSignatureChange={handleSignatureChange} 
                    />
                    <Observations onObservationsChange={handleObservationsChange} />
                    <PhotoCapture onPhotosChange={handlePhotosChange} />
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button 
                            variant="contained" 
                            onClick={generatePdf} 
                            sx={{ padding: '10px 30px', fontSize: '1.1rem' }}
                        >
                            Generar PDF
                        </Button>
                    </Box>
                </Box>
            </Container>
        </ThemeProvider>
    );
}

export default App;