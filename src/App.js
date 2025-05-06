import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Container, Box, Button, Snackbar, Alert, Typography, Tab, Tabs, Paper, Grid } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- NUEVAS IMPORTACIONES ---
import { onAuthChange, getCurrentUser, logout } from './services/authService'; // Asume que existe este servicio
import { saveFormSummary } from './services/formDataService'; // Asume que existe este servicio (Firebase/Supabase)
import Login from './components/Login'; // Asume que existe este componente
import Dashboard from './components/dashboard/Dashboard'; // NUEVA IMPORTACIÓN
// --- FIN NUEVAS IMPORTACIONES ---

// Importación de los logos en base64
import { HEADER_LOGO, FOOTER_BANNER } from './assets/logoImages.js';

import HeaderForm from './components/HeaderForm';
import ChecklistSection from './components/ChecklistSection';
import SignatureCapture from './components/SignatureCapture';
import Observations from './components/Observations';
import PhotoCapture from './components/PhotoCapture';
import SavedForms from './components/SavedForms';
import GeoLocationCapture from './components/GeoLocationCapture';
import { getChecklistData, getMaxPuntosPosibles } from './data';
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
    const [viewMode, setViewMode] = useState('form'); // 'form', 'saved' o 'dashboard'

    // --- NUEVOS ESTADOS ---
    const [user, setUser] = useState(null); // Estado para el usuario autenticado
    const [authChecked, setAuthChecked] = useState(false); // Estado para saber si ya se verificó la auth inicial
    // --- FIN NUEVOS ESTADOS ---

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

    // Nuevo estado para el tipo de espacio y checklist dinámico
    const [tipoEspacio, setTipoEspacio] = useState('');
    const [checklistItems, setChecklistItems] = useState(getChecklistData());

    // Estado para la puntuación total
    const [puntuacionTotal, setPuntuacionTotal] = useState({
        total: 0,
        promedio: 0,
        completado: 0,
        maxPuntosPosibles: 0,
        porcentajeCumplimiento: 0
    });

    // Estado para el formulario actual
    const [currentFormId, setCurrentFormId] = useState(null);
    const [formChanged, setFormChanged] = useState(false);

    // Estado para notificaciones
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // --- NUEVO useEffect PARA AUTENTICACIÓN ---
    useEffect(() => {
        // Suscribirse a los cambios de autenticación
        const unsubscribe = onAuthChange((user) => {
            setUser(user); // Actualiza el usuario (puede ser null si no está logueado)
            setAuthChecked(true); // Marca que la verificación inicial ya se hizo
        });

        // Limpiar la suscripción al desmontar el componente
        return () => unsubscribe();
    }, []); // El array vacío asegura que se ejecute solo una vez al montar
    // --- FIN useEffect AUTENTICACIÓN ---

    // Limpiar formularios antiguos al inicio
    useEffect(() => {
        cleanupOldForms();
    }, []);

    // Efecto para autoguardado (solo local)
    useEffect(() => {
        // Solo autoguardar si hay cambios y el usuario está logueado
        if (formChanged && user) {
            const autoSaveTimer = setTimeout(() => {
                const formData = {
                    headerData,
                    signatures,
                    generalObservations,
                    checklistSectionsData,
                    photos,
                    geoLocation,
                    tipoEspacio,
                    puntuacionTotal,
                    lastUpdated: new Date().toISOString()
                };

                // Guardar SOLO en localStorage sin sincronizar
                const savedId = saveFormToLocalStorage(formData, currentFormId);
                if (savedId && currentFormId !== savedId) {
                    setCurrentFormId(savedId);
                }

                setFormChanged(false);
                console.log('Autoguardado en localStorage completado');
            }, 5000); // Autoguardar después de 5 segundos de inactividad

            return () => clearTimeout(autoSaveTimer);
        }
    }, [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, tipoEspacio, puntuacionTotal, formChanged, user, currentFormId]);

    // Efecto para registrar cambios en los datos
    useEffect(() => {
        // Evitar marcar como cambiado al inicio si solo se setea fecha/hora
        if (currentFormId || (Object.keys(headerData).length > 2 || generalObservations || Object.keys(checklistSectionsData).length > 0 || photos.length > 0 || Object.keys(signatures).some(k => signatures[k].data) || Object.keys(geoLocation).length > 0)) {
            setFormChanged(true);
        }
    }, [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, currentFormId]);

    // Efecto para manejar cambios en el tipo de espacio
    useEffect(() => {
        const newChecklist = getChecklistData(tipoEspacio);
        setChecklistItems(newChecklist);
        setChecklistSectionsData({}); // Reiniciar datos del checklist
    }, [tipoEspacio]);

    // Efecto para calcular la puntuación total
    useEffect(() => {
        let totalPuntos = 0;
        let itemsRespondidos = 0;
        let totalItemsCalculado = 0;

        checklistItems.forEach(section => {
            const sectionData = checklistSectionsData[section.title];
            const numItemsInSection = section.items.length;
            totalItemsCalculado += numItemsInSection;

            if (sectionData && sectionData.puntuacion) {
                totalPuntos += sectionData.puntuacion.total || 0;
                itemsRespondidos += sectionData.puntuacion.respondidos || 0;
            }
        });

        const promedio = itemsRespondidos > 0 ? Math.round(totalPuntos / itemsRespondidos) : 0;
        const maxPuntosPosibles = getMaxPuntosPosibles(tipoEspacio);
        const porcentajeCumplimiento = maxPuntosPosibles > 0 ? Math.round((totalPuntos / maxPuntosPosibles) * 100) : 0;
        const completado = totalItemsCalculado > 0 ? Math.round((itemsRespondidos / totalItemsCalculado) * 100) : 0;

        setPuntuacionTotal({
            total: totalPuntos,
            promedio: promedio,
            completado: completado,
            maxPuntosPosibles: maxPuntosPosibles,
            porcentajeCumplimiento: porcentajeCumplimiento
        });
    }, [checklistSectionsData, checklistItems, tipoEspacio]);

    // --- NUEVA FUNCIÓN ---
    // Función para manejar login exitoso
    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser);
        setViewMode('form'); // Opcional: redirigir al formulario después del login
    };
    // --- FIN NUEVA FUNCIÓN ---

    // <<< VERSIÓN CORREGIDA: saveCurrentForm (SOLO GUARDADO LOCAL) >>>
    const saveCurrentForm = () => {
        // No guardar si no hay cambios o si el usuario no está logueado
        if (!formChanged || !user) {
            console.log("saveCurrentForm: No hay cambios o no hay usuario. Saliendo.");
            return;
        }

        const formData = {
            headerData,
            signatures,
            generalObservations,
            checklistSectionsData,
            photos,
            geoLocation,
            tipoEspacio,
            puntuacionTotal,
            lastUpdated: new Date().toISOString()
        };

        // Guardar SOLO en localStorage
        const savedId = saveFormToLocalStorage(formData, currentFormId);
        if (savedId && currentFormId !== savedId) {
            setCurrentFormId(savedId); // Actualizar ID si es nuevo
        }

        // Mostrar notificación de guardado local
        setNotification({
            open: true,
            message: 'Cambios guardados localmente',
            severity: 'success'
        });

        // Marcar como no cambiado después del guardado local
        setFormChanged(false);
        console.log("Guardado local completado (sin sincronización con Firebase)");
    };
    // <<< FIN VERSIÓN CORREGIDA: saveCurrentForm >>>

    // Cargar un formulario guardado
    const loadSavedForm = (formId) => {
        if (!formId) {
            resetForm();
            setViewMode('form');
            return;
        }

        const savedForm = getFormFromLocalStorage(formId);
        if (savedForm && savedForm.data) {
            const { data } = savedForm;

            setHeaderData(data.headerData || {});
            setSignatures(data.signatures || {
                'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
                'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
            });
            setGeneralObservations(data.generalObservations || '');
            setChecklistSectionsData(data.checklistSectionsData || {});
            setPhotos(data.photos || []);
            setGeoLocation(data.geoLocation || {});
            setTipoEspacio(data.tipoEspacio || '');
            setPuntuacionTotal(data.puntuacionTotal || { total: 0, promedio: 0, completado: 0, maxPuntosPosibles: 0, porcentajeCumplimiento: 0 });

            setCurrentFormId(formId);
            setFormChanged(false); // Al cargar, se asume que no hay cambios iniciales
            setViewMode('form');

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
            resetForm(); // Resetear si no se pudo cargar para evitar estado inconsistente
        }
    };

    // Resetear el formulario
    const resetForm = () => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

        setHeaderData({ fechaVisita: currentDate, horaVisita: currentTime });
        setSignatures({
            'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
            'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
        });
        setGeneralObservations('');
        setChecklistSectionsData({});
        setPhotos([]);
        setGeoLocation({});
        setTipoEspacio('');
        setPuntuacionTotal({ total: 0, promedio: 0, completado: 0, maxPuntosPosibles: 0, porcentajeCumplimiento: 0 });
        setCurrentFormId(null); // Asegurarse de limpiar el ID
        setFormChanged(false);
    };

    // Cerrar notificación
    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    // Manejadores para actualizar los estados (sin cambios aquí)
    const handleHeaderDataChange = (data) => setHeaderData(prev => ({ ...prev, ...data }));
    const handleTipoEspacioChange = (tipo) => setTipoEspacio(tipo);
    const handleSignatureChange = (role, signatureData, checked) => {
        const normalizedRole = role.toLowerCase();
        setSignatures(prev => ({ ...prev, [normalizedRole]: { data: signatureData, checked } }));
    };
    const handleObservationsChange = (observations) => setGeneralObservations(observations);
    const handlePhotosChange = (newPhotos) => setPhotos(newPhotos);
    const handleGeoLocationChange = (location) => setGeoLocation(location);
    const handleSectionDataChange = (sectionTitle, sectionDataUpdater) => {
        setChecklistSectionsData(prevState => ({
            ...prevState,
            [sectionTitle]: sectionDataUpdater(prevState[sectionTitle] || {})
        }));
    };

    // generateTableData (sin cambios aquí)
    const generateTableData = () => {
        const tableRows = [];
        checklistItems.forEach((section) => {
            tableRows.push([{ content: ' ', colSpan: 2, styles: { cellPadding: 3 } }]);
            const sectionData = checklistSectionsData[section.title] || {};
            const puntuacion = sectionData.puntuacion || { total: 0, promedio: 0 };
            tableRows.push([{
                content: `${section.title.toUpperCase()} - Puntuación: ${puntuacion.total} pts | Promedio: ${puntuacion.promedio}/100`,
                colSpan: 2,
                styles: { fillColor: [30, 136, 229], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 12, cellPadding: 10 }
            }]);
            tableRows.push([
                { content: 'Criterio', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240], cellWidth: 140, fontSize: 11, cellPadding: 8 } },
                { content: 'Condición', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240], cellWidth: 50, fontSize: 11, cellPadding: 8 } }
            ]);
            section.items.forEach(item => {
                const itemData = checklistSectionsData[section.title]?.[item.id] || {};
                const displayValue = itemData.displayText || 'N/A';
                tableRows.push([
                    { content: `${item.number}. ${item.label}`, styles: { fontStyle: 'normal', halign: 'left', cellWidth: 140, fontSize: 10, cellPadding: 6, overflow: 'linebreak' } },
                    { content: displayValue, styles: { halign: 'center', cellWidth: 50, fontSize: 10, cellPadding: 6 } }
                ]);
            });
        });
        return tableRows;
    };

    // <<< ESTE ES EL ÚNICO LUGAR QUE DEBE SINCRONIZAR CON FIREBASE >>>
    // generatePdf (Sin cambios funcionales, sigue sincronizando)
    const generatePdf = async () => {
        let syncError = null;
        if (!currentFormId) {
            console.error("No hay formulario activo para finalizar.");
            setNotification({ open: true, message: 'Error: No hay formulario activo para finalizar.', severity: 'error' });
            return;
        }
        markFormAsComplete(currentFormId);
        if (user) {
            const summaryData = {
                formId: currentFormId,
                headerData: {
                    fechaVisita: headerData.fechaVisita, horaVisita: headerData.horaVisita,
                    espacioAtencion: headerData.espacioAtencion, entidadContratista: headerData.entidadContratista,
                    apoyoSupervision: headerData.apoyoSupervision,
                    pmAsistentes: headerData.pmAsistentes, numeroContrato: headerData.numeroContrato,
                    nombreProfesional: headerData.nombreProfesional, nombreSupervisor: headerData.nombreSupervisor
                },
                geoLocation: {
                    latitude: geoLocation?.latitude, longitude: geoLocation?.longitude,
                    timestamp: geoLocation?.timestamp, address: geoLocation?.address
                },
                tipoEspacio: tipoEspacio,
                puntuacionTotal: {
                    total: puntuacionTotal.total, promedio: puntuacionTotal.promedio, completado: puntuacionTotal.completado,
                    maxPuntosPosibles: puntuacionTotal.maxPuntosPosibles, porcentajeCumplimiento: puntuacionTotal.porcentajeCumplimiento
                },
               
                checklistSectionsData: checklistSectionsData,
                isComplete: true,
                userid: user.uid || user.id,
                userEmail: user.email,
                lastUpdated: new Date().toISOString() // Timestamp de finalización
            };

            try {
                await saveFormSummary(summaryData); // ESTA ES LA ÚNICA SINCRONIZACIÓN CON FIREBASE
                console.log('Formulario completo sincronizado con backend ID:', currentFormId);
            } catch (error) {
                console.error('Error al sincronizar formulario completo en backend:', error);
                syncError = error; // Guardar el error para mostrar notificación después
            }
        }

        // --- Inicio del código de generación PDF (sin cambios funcionales aquí) ---
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', margins: { top: 40, bottom: 40, left: 20, right: 20 } });
        const standardTableHead = (title1, title2) => [[{ content: title1, styles: { halign: 'center', fillColor: [30, 136, 229], textColor: 255, fontSize: 12, fontStyle: 'bold' } }, { content: title2, styles: { halign: 'center', fillColor: [30, 136, 229], textColor: 255, fontSize: 12, fontStyle: 'bold' } }]];
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        let currentY = 45;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16).setFont('helvetica', 'bold');
        let reportTitle = 'Reporte de Supervisión - Centros de Vida';
        if (tipoEspacio === 'cdvfijo') reportTitle += ' (Centro Fijo)';
        else if (tipoEspacio === 'cdvparque') reportTitle += ' (Espacio Comunitario)';
        doc.text(reportTitle, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;
        doc.setFontSize(12).setFont('helvetica', 'normal');

        const resumenData = [
            ['Puntuación Total', `${puntuacionTotal.total}/${puntuacionTotal.maxPuntosPosibles} puntos (${puntuacionTotal.porcentajeCumplimiento}%)`],
            ['Promedio General', `${puntuacionTotal.promedio}/100`],
            ['Porcentaje Completado', `${puntuacionTotal.completado}%`]
        ];
        doc.autoTable({ head: standardTableHead('Resumen de Evaluación', 'Valores'), body: resumenData, startY: currentY, theme: 'grid', styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' }, margin: { left: margin, right: margin }, headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255], fontStyle: 'bold' } });
        currentY = doc.lastAutoTable.finalY + 10;

        const headerRows = [
            ['Fecha de Visita', headerData.fechaVisita || 'N/A'], ['Hora de Visita', headerData.horaVisita || 'N/A'],
            ['Tipo de Espacio', tipoEspacio === 'cdvfijo' ? 'Centro de Vida Fijo' : tipoEspacio === 'cdvparque' ? 'Centro de Vida Parque/Espacio Comunitario' : 'N/A'],
            ['Espacio de Atención', headerData.espacioAtencion || 'N/A'], ['Apoyo a la supervisión quien realiza la visita', headerData.apoyoSupervision || 'N/A'],
            ['Personas mayores asistentes', headerData.pmAsistentes || 'N/A'], ['Contratista', headerData.entidadContratista || 'N/A'],
            ['NIT', headerData.nit || 'N/A'], ['No de contrato', headerData.numeroContrato || 'N/A'],
            ['Rep. Legal', headerData.nombreRepresentante || 'N/A'], ['Persona quien atiende la visita', headerData.nombreProfesional || 'N/A'],
            ['Supervisor del Distrito', headerData.nombreSupervisor || 'N/A']
        ];
        doc.autoTable({ head: standardTableHead('Datos de la Visita', 'Información'), body: headerRows, startY: currentY, theme: 'grid', styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' }, margin: { left: margin, right: margin }, columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 'auto' } } });
        currentY = doc.lastAutoTable.finalY + 15;

        if (geoLocation && (geoLocation.latitude || geoLocation.longitude)) {
            if (currentY + 80 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
            const geoRows = [];
            if (geoLocation.latitude && geoLocation.longitude) { geoRows.push(['Latitud', geoLocation.latitude.toFixed(6)]); geoRows.push(['Longitud', geoLocation.longitude.toFixed(6)]); }
            if (geoLocation.accuracy) { geoRows.push(['Precisión', `±${geoLocation.accuracy.toFixed(0)} metros`]); }
            if (geoLocation.timestamp) { geoRows.push(['Registrado', new Date(geoLocation.timestamp).toLocaleString()]); }
            if (geoLocation.address) { geoRows.push(['Dirección aproximada', geoLocation.address]); }
            if (geoRows.length > 0) {
                doc.autoTable({ head: standardTableHead('Georreferenciación de la Visita', 'Datos'), body: geoRows, startY: currentY, theme: 'grid', styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' }, margin: { left: margin, right: margin }, columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 'auto' } } });
                currentY = doc.lastAutoTable.finalY + 15;
            }
        }

        doc.autoTable({ body: generateTableData(), startY: currentY, theme: 'grid', styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' }, margin: { left: margin, right: margin }, tableWidth: pageWidth - (margin * 2), didDrawPage: (data) => { addHeaderAndFooter(doc); } });
        currentY = doc.lastAutoTable.finalY + 15;

        const requiredSpace = 30 + (Object.keys(signatures).length * 60) + (generalObservations ? 40 : 0) + (photos.length > 0 ? 40 : 0);
        if (currentY + requiredSpace > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }

        // Firmas
        doc.setFontSize(14).setFont('helvetica', 'bold').text('Firmas:', margin, currentY); currentY += 15;
        const uniqueRoles = [...new Set(Object.keys(signatures).map(role => role.toLowerCase()))];
        for (let i = 0; i < uniqueRoles.length; i++) {
            const role = uniqueRoles[i];
            if (currentY + 50 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
            const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
            if (signatures[role]?.data) {
                doc.addImage(signatures[role].data, 'PNG', margin, currentY, 60, 40);
                doc.setFontSize(10).setFont('helvetica', 'normal').text(`Firma de ${displayRole}`, margin, currentY + 50);
            } else {
                doc.setFontSize(10).setFont('helvetica', 'normal').text(`Firma de ${displayRole}: No firmado`, margin, currentY + 10);
            }
            currentY += 60;
        }

        // Observaciones
        if (generalObservations) {
            if (currentY + 50 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
            doc.setFontSize(14).setFont('helvetica', 'bold').text('Observaciones Generales:', margin, currentY); currentY += 10;
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const textLines = doc.splitTextToSize(generalObservations, pageWidth - (margin * 2));
            doc.text(textLines, margin, currentY);
            currentY += (textLines.length * 7) + 15;
        }

        // Fotos
        if (photos && photos.length > 0) {
            if (currentY + 40 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
            doc.setFontSize(14).setFont('helvetica', 'bold').text('Evidencia Fotográfica:', margin, currentY); currentY += 15;
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                if (currentY + 110 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
                try {
                    // Reducir calidad JPEG para ahorrar espacio en PDF
                    doc.addImage(photo.preview, 'JPEG', margin, currentY, 80, 80, undefined, 'MEDIUM');
                    doc.setFontSize(11).setFont('helvetica', 'bold').text(`Foto ${i + 1}:`, margin + 90, currentY + 10);
                    doc.setFontSize(10).setFont('helvetica', 'normal');
                    const lines = doc.splitTextToSize(photo.description || 'Sin descripción', pageWidth - margin - (margin + 90) - 10);
                    doc.text(lines, margin + 90, currentY + 20);
                    const photoDate = new Date(photo.timestamp);
                    const formattedDate = `${photoDate.toLocaleDateString()} ${photoDate.toLocaleTimeString()}`;
                    doc.text(`Fecha: ${formattedDate}`, margin + 90, currentY + 40 + (lines.length * 5));
                    currentY += 95;
                } catch (error) {
                    console.error('Error al agregar la imagen al PDF:', error);
                    doc.setFontSize(10).setFont('helvetica', 'italic').text(`[No se pudo incluir la foto ${i + 1}]`, margin, currentY); currentY += 15;
                }
            }
        }

        // Encabezado/Pie a todas las páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) { doc.setPage(i); addHeaderAndFooter(doc); }

        doc.save(`reporte_${headerData.espacioAtencion || 'supervision'}_${headerData.fechaVisita || 'fecha'}.pdf`);

        // Mostrar notificación final
        if (syncError) {
            setNotification({ open: true, message: 'PDF generado. Error al sincronizar datos finalizados.', severity: 'warning' });
        } else if (user) {
            setNotification({ open: true, message: 'PDF generado y datos finalizados sincronizados.', severity: 'success' });
        } else {
            setNotification({ open: true, message: 'PDF generado. Datos guardados localmente.', severity: 'info' });
        }
        // Marcar formulario como no cambiado DESPUÉS de generar PDF y sincronizar (si aplica)
        setFormChanged(false);
    };
    // <<< FIN DE SINCRONIZACIÓN CON FIREBASE >>>

    // addHeaderAndFooter (sin cambios aquí)
    const addHeaderAndFooter = (doc) => {
        const pageWidth = doc.internal.pageSize.width; const pageHeight = doc.internal.pageSize.height;
        try {
            doc.addImage(HEADER_LOGO, 'JPEG', 0, 0, pageWidth, 30);
            doc.addImage(FOOTER_BANNER, 'JPEG', 0, pageHeight - 20, pageWidth, 20);
        } catch (error) {
            console.error('Error al cargar las imágenes:', error);
            doc.setFillColor(12, 35, 64); doc.rect(0, 0, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(16).setFont('helvetica', 'bold'); doc.text('ALCALDÍA DE BARRANQUILLA', pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(10).setFont('helvetica', 'normal'); doc.text('NIT: 890102018-1', pageWidth / 2, 22, { align: 'center' });
            doc.setDrawColor(12, 35, 64); doc.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20);
            doc.setFontSize(8).setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text('Calle 34 No. 43-31. Barranquilla.Colombia', pageWidth / 2, pageHeight - 15, { align: 'center' }); doc.text('BARRANQUILLA.GOV.CO', pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
    };

    // --- NUEVA CONDICIÓN PARA PANTALLA DE LOGIN ---
    if (!authChecked) {
        return (
            <ThemeProvider theme={theme}>
                <Container maxWidth="sm">
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                        <Typography>Verificando sesión...</Typography>
                    </Box>
                </Container>
            </ThemeProvider>
        );
    }

    if (authChecked && !user) {
        return (
            <ThemeProvider theme={theme}>
                <Container maxWidth="sm">
                    <Box sx={{ py: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography component="h1" variant="h4" gutterBottom align="center">
                            Sistema de Visitas y Supervisión
                        </Typography>
                        <Typography component="h2" variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
                            Iniciar Sesión
                        </Typography>
                        <Login onLoginSuccess={handleLoginSuccess} />
                    </Box>
                </Container>
            </ThemeProvider>
        );
    }
    // --- FIN CONDICIÓN LOGIN ---

    // Si el usuario está autenticado, mostrar la app normal
    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="lg">
                {/* --- MODIFICACIÓN SECCIÓN TABS --- */}
                <Paper sx={{ position: 'sticky', top: 0, zIndex: 1000, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={viewMode}
                            onChange={(e, newValue) => {
                                // Solo guardar localmente (sin sincronizar) si hay cambios
                                if (formChanged && viewMode === 'form' && user) {
                                    saveCurrentForm(); // Ahora solo guarda localmente
                                }
                                setViewMode(newValue);
                            }}
                            sx={{ flexGrow: 1 }}
                        >
                            <Tab label="Formulario Actual" value="form" />
                            <Tab label="Formularios Guardados" value="saved" />
                            <Tab label="Dashboard" value="dashboard" />
                        </Tabs>

                        {user && (
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                                <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                                    {user.email}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={async () => {
                                        try {
                                            await logout();
                                            setUser(null);
                                            setViewMode('form');
                                            resetForm(); // Resetear formulario al cerrar sesión
                                        } catch (error) {
                                            console.error("Error al cerrar sesión:", error);
                                            setNotification({ open: true, message: 'Error al cerrar sesión.', severity: 'error' });
                                        }
                                    }}
                                >
                                    Cerrar sesión
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Paper>
                {/* --- FIN MODIFICACIÓN SECCIÓN TABS --- */}

                {/* Mostrar el título con información del formulario actual */}
                {viewMode === 'form' && (
                    <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
                        <Typography variant="h5">
                            {currentFormId ? 'Editando Formulario' : 'Nuevo Formulario'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {currentFormId
                                ? `ID: ${currentFormId.substring(0, 8)}... ${formChanged ? '(Cambios sin guardar localmente)' : '(Guardado localmente)'}`
                                : 'Crea un nuevo formulario.'}
                        </Typography>
                        {currentFormId && // Mostrar solo si hay un form cargado
                            <Typography variant="caption" color="textSecondary">
                                Última act. local: { getFormFromLocalStorage(currentFormId)?.data.lastUpdated ? new Date(getFormFromLocalStorage(currentFormId).data.lastUpdated).toLocaleString() : 'N/A'}
                            </Typography>
                        }
                    </Box>
                )}

                {/* Contenido principal: Formulario o Lista o Dashboard */}
                {viewMode === 'form' ? (
                    <Box sx={{ py: 4 }}>
                        <HeaderForm
                            onDataChange={handleHeaderDataChange}
                            initialData={headerData}
                            onTipoEspacioChange={handleTipoEspacioChange}
                        />

                        {/* Resumen de puntuación total */}
                        {(Object.keys(checklistSectionsData).length > 0 || tipoEspacio) && (
                            <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: '#f5f5f5' }}>
                                <Typography variant="h6" gutterBottom>Resumen de Evaluación</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={3}>
                                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                                            <Typography variant="body2" color="textSecondary">Puntuación Total</Typography>
                                            <Typography variant="h4" color="primary" fontWeight="bold">{puntuacionTotal.total}/{puntuacionTotal.maxPuntosPosibles}</Typography>
                                            <Typography variant="body2" color="textSecondary">({puntuacionTotal.porcentajeCumplimiento}% de cumplimiento)</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                                            <Typography variant="body2" color="textSecondary">Promedio General</Typography>
                                            <Typography variant="h4" fontWeight="bold" sx={{ color: puntuacionTotal.promedio >= 80 ? '#2e7d32' : puntuacionTotal.promedio >= 60 ? '#ed6c02' : '#d32f2f' }}>
                                                {puntuacionTotal.promedio}/100
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                                            <Typography variant="body2" color="textSecondary">Completado</Typography>
                                            <Typography variant="h4" color="info.main" fontWeight="bold">{puntuacionTotal.completado}%</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                                            <Typography variant="body2" color="textSecondary">Tipo de Espacio</Typography>
                                            <Typography variant="h6" fontWeight="bold">
                                                {tipoEspacio === 'cdvfijo' ? 'CDV Fijo' : tipoEspacio === 'cdvparque' ? 'CDV Parque' : 'Sin definir'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}

                        <GeoLocationCapture onLocationChange={handleGeoLocationChange} initialData={geoLocation} />

                        {checklistItems.map((section) => (
                            <ChecklistSection key={section.title} title={section.title} items={section.items} onSectionDataChange={handleSectionDataChange} initialData={checklistSectionsData[section.title]} />
                        ))}

                        <SignatureCapture label="apoyo a la supervisión quien realiza la visita" onSignatureChange={handleSignatureChange} initialData={signatures['apoyo a la supervisión quien realiza la visita']} />
                        <SignatureCapture label="profesional/técnico del contratista quien atiende la visita" onSignatureChange={handleSignatureChange} initialData={signatures['profesional/técnico del contratista quien atiende la visita']} />
                        <Observations onObservationsChange={handleObservationsChange} initialData={generalObservations} />
                        <PhotoCapture onPhotosChange={handlePhotosChange} initialData={photos} />

                        <Box sx={{ mt: 3, pb: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    // Si hay cambios, guardar LOCALMENTE primero
                                    if (formChanged) {
                                        saveCurrentForm(); // Ya no sincroniza con Firebase
                                    }
                                    // Luego, generar PDF (que SÍ sincroniza)
                                    generatePdf();
                                }}
                                sx={{ padding: '10px 30px', fontSize: '1.1rem' }}
                                disabled={!currentFormId}>
                                Finalizar y Generar PDF
                            </Button>
                            {/* Botón de guardado local actualizado */}
                            <Button
                                variant="outlined"
                                onClick={saveCurrentForm}
                                sx={{ padding: '10px 30px', fontSize: '1.1rem' }}
                                disabled={!formChanged}
                            >
                                Guardar Localmente
                            </Button>
                        </Box>
                    </Box>
                ) : viewMode === 'saved' ? (
                    <SavedForms onLoadForm={loadSavedForm} user={user} />
                ) : viewMode === 'dashboard' ? (
                    <Dashboard user={user} />
                ) : null}

                {/* Notificaciones */}
                <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }} variant="filled">
                        {notification.message}
                    </Alert>
                </Snackbar>
            </Container>
        </ThemeProvider>
    );
}

export default App;