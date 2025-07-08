import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Container, Box, Button, Snackbar, Alert, Typography, Tab, Tabs, Paper, Grid } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- IMPORTACIONES DE SERVICIOS Y COMPONENTES ---
// Servicios de autenticación (manteniendo los que no cambian)
import { onAuthChange, getCurrentUser, logout } from './services/authService'; 
// Servicios de roles de usuario (actualizados/nuevos)
import { getUserRole, ROLES, updateLastLogin } from './services/userRoleService'; // << NUEVA IMPORTACIÓN / ACTUALIZADA
import { saveFormSummary } from './services/formDataService'; 
import Login from './components/Login'; 
import Dashboard from './components/dashboard/Dashboard'; 
import AdminPanel from './components/admin/AdminPanel'; // << NUEVA IMPORTACIÓN

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
    // Estado para controlar el modo de visualización
    const [viewMode, setViewMode] = useState('form'); // 'form', 'saved', 'dashboard' o 'admin'

    // Estados de autenticación y usuario
    const [user, setUser] = useState(null); 
    const [authChecked, setAuthChecked] = useState(false); 
    const [userRole, setUserRole] = useState(null); 

    // Estados para los diferentes componentes del formulario
    const [headerData, setHeaderData] = useState({});
    const [signatures, setSignatures] = useState({
        'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
        'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
    });
    const [generalObservations, setGeneralObservations] = useState('');
    const [checklistSectionsData, setChecklistSectionsData] = useState({});
    const [photos, setPhotos] = useState([]);
    const [geoLocation, setGeoLocation] = useState({});
    const [tipoEspacio, setTipoEspacio] = useState('');
    const [checklistItems, setChecklistItems] = useState(getChecklistData());
    const [puntuacionTotal, setPuntuacionTotal] = useState({
        total: 0,
        promedio: 0,
        completado: 0,
        maxPuntosPosibles: 0,
        porcentajeCumplimiento: 0
    });
    const [currentFormId, setCurrentFormId] = useState(null);
    const [formChanged, setFormChanged] = useState(false);
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // 🔧 MEJORA: Estado para manejar verificaciones de sesión sin perder datos
    const [authVerifying, setAuthVerifying] = useState(false);

    // 🔧 MEJORA: useEffect para autenticación más robusto
    useEffect(() => {
        let authTimeout;
        
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            setAuthVerifying(true);
            
            // 🔧 MEJORA: Debounce para evitar verificaciones múltiples rápidas
            clearTimeout(authTimeout);
            authTimeout = setTimeout(async () => {
                try {
                    if (firebaseUser) {
                        const role = await getUserRole(firebaseUser.uid);
                        
                        if (!role) {
                            console.log("Usuario no autorizado, cerrando sesión...");
                            await logout();
                            setUser(null);
                            setUserRole(null);
                            setNotification({
                                open: true,
                                message: 'Acceso denegado. Contacte al administrador.',
                                severity: 'error'
                            });
                        } else {
                            // 🔧 MEJORA: Solo actualizar usuario si realmente cambió
                            if (!user || user.uid !== firebaseUser.uid) {
                                setUser(firebaseUser);
                                setUserRole(role);
                                await updateLastLogin(firebaseUser.uid);
                            }
                        }
                    } else {
                        // 🔧 MEJORA: Solo resetear usuario si realmente no hay usuario
                        // (evita resets durante verificaciones temporales)
                        if (user) {
                            setUser(null);
                            setUserRole(null);
                        }
                    }
                } catch (error) {
                    console.error("Error al verificar autorización:", error);
                    // 🔧 MEJORA: No cerrar sesión por errores de red temporales
                    if (error.code !== 'unavailable' && error.code !== 'deadline-exceeded') {
                        await logout();
                        setUser(null);
                        setUserRole(null);
                        setNotification({ 
                            open: true,
                            message: 'Error al verificar autorización. Sesión cerrada.',
                            severity: 'error'
                        });
                    }
                } finally {
                    setAuthChecked(true);
                    setAuthVerifying(false);
                }
            }, 500); // 500ms de debounce
        });

        return () => {
            unsubscribe();
            clearTimeout(authTimeout);
        };
    }, []); // 🔧 MEJORA: Removido 'user' de dependencias para evitar loops

    // Limpiar formularios antiguos al inicio
    useEffect(() => {
        cleanupOldForms();
    }, []);

    // 🔧 DESHABILITADO: Autoguardado automático para mejorar performance en campo
    /*
    // 🔧 DESHABILITADO: Autoguardado automático para mejorar performance en campo
    /*
    useEffect(() => {
        if (formChanged) { // 🎯 SIN dependencia de 'user'
            // 🔍 DEBUG: Incrementar contador de renders
            renderCountRef.current += 1;
            lastChangeTimeRef.current = Date.now();
            
            console.log('🔍 RENDER CYCLES:', {
                renderCount: renderCountRef.current,
                formChanged,
                checklistKeys: Object.keys(checklistSectionsData),
                observationsLength: generalObservations?.length,
                lastObservationChar: generalObservations?.slice(-1),
                timestamp: new Date().toISOString()
            });
            
            console.log('⏱️ App: Iniciando timer de autoguardado (5 segundos con debounce)');
            const autoSaveTimer = setTimeout(() => {
                // 🔧 DEBOUNCE: Solo guardar si no hay cambios recientes (2 segundos)
                const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;
                if (timeSinceLastChange < 2000) {
                    console.log('⏭️ App: Saltando autoguardado, cambios muy recientes');
                    return;
                }
                
                try {
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
                    
                    console.log('💾 App: Ejecutando autoguardado con datos:', {
                        headerKeys: Object.keys(headerData),
                        observationsLength: generalObservations?.length || 0,
                        checklistSections: Object.keys(checklistSectionsData),
                        photosCount: photos.length,
                        observationsContent: generalObservations,
                        renderCount: renderCountRef.current
                    });
                    
                    const savedId = saveFormToLocalStorage(formData, currentFormId);
                    if (savedId && currentFormId !== savedId) {
                        setCurrentFormId(savedId);
                    }
                    setFormChanged(false);
                    console.log('✅ App: Autoguardado local completado exitosamente, ID:', savedId);
                } catch (error) {
                    console.error('❌ App: Error en autoguardado local:', error);
                }
            }, 5000); // 🔧 MEJORA: Aumentado a 5 segundos
            
            return () => {
                console.log('🔄 App: Cancelando timer de autoguardado');
                clearTimeout(autoSaveTimer);
            };
        }
    }, [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, tipoEspacio, puntuacionTotal, formChanged, currentFormId]); // 🎯 SIN 'user'
    */

    // 🔧 DESHABILITADO: Guardado de emergencia al perder foco de ventana para mejorar performance
    /*
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (formChanged) {
                const formData = {
                    headerData, signatures, generalObservations, checklistSectionsData,
                    photos, geoLocation, tipoEspacio, puntuacionTotal,
                    lastUpdated: new Date().toISOString()
                };
                saveFormToLocalStorage(formData, currentFormId);
                console.log('Guardado de emergencia antes de cerrar');
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && formChanged) {
                const formData = {
                    headerData, signatures, generalObservations, checklistSectionsData,
                    photos, geoLocation, tipoEspacio, puntuacionTotal,
                    lastUpdated: new Date().toISOString()
                };
                saveFormToLocalStorage(formData, currentFormId);
                console.log('Guardado de emergencia al minimizar ventana');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [formChanged, headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, tipoEspacio, puntuacionTotal, currentFormId]);
    */

    // 🔧 SIMPLIFICADO: Detección de cambios sin loops infinitos
    useEffect(() => {
        const hasHeaderData = Object.keys(headerData).length > 2;
        const hasObservations = generalObservations && generalObservations.trim().length > 0;
        const hasChecklistData = Object.keys(checklistSectionsData).length > 0;
        const hasPhotos = photos.length > 0;
        const hasSignatures = Object.keys(signatures).some(k => signatures[k].data);
        const hasGeoLocation = Object.keys(geoLocation).length > 0;
        
        // � SIMPLIFICADO: Solo marcar como cambiado si realmente hay datos y no está ya marcado
        const hasData = hasHeaderData || hasObservations || hasChecklistData || hasPhotos || hasSignatures || hasGeoLocation;
        if (hasData && !formChanged) {
            setFormChanged(true);
        }
    }, [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, formChanged]); // Removido currentFormId

    // Efecto para manejar cambios en el tipo de espacio
    useEffect(() => {
        const newChecklist = getChecklistData(tipoEspacio);
        setChecklistItems(newChecklist);
        setChecklistSectionsData({});
    }, [tipoEspacio]);

    // Efecto para calcular la puntuación total
    useEffect(() => {
        let totalPuntos = 0, itemsRespondidos = 0, totalItemsCalculado = 0;
        checklistItems.forEach(section => {
            const sectionData = checklistSectionsData[section.title];
            totalItemsCalculado += section.items.length;
            if (sectionData && sectionData.puntuacion) {
                totalPuntos += sectionData.puntuacion.total || 0;
                itemsRespondidos += sectionData.puntuacion.respondidos || 0;
            }
        });
        const promedio = itemsRespondidos > 0 ? Math.round(totalPuntos / itemsRespondidos) : 0;
        const maxPuntosPosibles = getMaxPuntosPosibles(tipoEspacio);
        const porcentajeCumplimiento = maxPuntosPosibles > 0 ? Math.round((totalPuntos / maxPuntosPosibles) * 100) : 0;
        const completado = totalItemsCalculado > 0 ? Math.round((itemsRespondidos / totalItemsCalculado) * 100) : 0;
        setPuntuacionTotal({ total: totalPuntos, promedio, completado, maxPuntosPosibles, porcentajeCumplimiento });
    }, [checklistSectionsData, checklistItems, tipoEspacio]);

    // Función para manejar login exitoso (usa getUserRole y updateLastLogin de userRoleService)
    const handleLoginSuccess = async (loggedInUser) => {
      try {
        const role = await getUserRole(loggedInUser.uid); // Usa getUserRole de userRoleService
        if (!role) {
          await logout();
          setUser(null); 
          setUserRole(null); 
          setNotification({
            open: true,
            message: 'Acceso denegado. Contacte al administrador.',
            severity: 'error'
          });
        } else {
          setUser(loggedInUser);
          setUserRole(role);
          await updateLastLogin(loggedInUser.uid); // Usa updateLastLogin de userRoleService
          setViewMode('form');
        }
      } catch (error) {
        console.error("Error al verificar autorización en login:", error);
        setUser(null);
        setUserRole(null);
        setNotification({
          open: true,
          message: 'Error al verificar permisos. Intente nuevamente.',
          severity: 'error'
        });
      }
    };

    // 🔧 MEJORA: Función de guardado local que siempre funciona
    const saveCurrentForm = () => {
        if (!formChanged) {
            setNotification({ open: true, message: 'No hay cambios para guardar', severity: 'info' });
            return;
        }
        
        try {
            const formData = {
                headerData, signatures, generalObservations, checklistSectionsData,
                photos, geoLocation, tipoEspacio, puntuacionTotal,
                lastUpdated: new Date().toISOString()
            };
            
            const savedId = saveFormToLocalStorage(formData, currentFormId);
            if (savedId && currentFormId !== savedId) setCurrentFormId(savedId);
            setNotification({ open: true, message: 'Cambios guardados localmente', severity: 'success' });
            setFormChanged(false);
        } catch (error) {
            console.error("❌ App: Error en guardado local manual:", error);
            setNotification({ open: true, message: 'Error al guardar localmente', severity: 'error' });
        }
    };

    const loadSavedForm = (formId) => {
        console.log('📂 App: Intentando cargar formulario:', formId);
        if (!formId) { 
            console.log('📂 App: No hay formId, reseteando formulario');
            resetForm(); 
            setViewMode('form'); 
            return; 
        }
        
        const savedForm = getFormFromLocalStorage(formId);
        console.log('📂 App: Formulario recuperado del localStorage:', savedForm);
        
        if (savedForm && savedForm.data) {
            const { data } = savedForm;
            console.log('📂 App: Cargando datos del formulario:', {
                headerKeys: Object.keys(data.headerData || {}),
                observationsLength: data.generalObservations?.length || 0,
                checklistSections: Object.keys(data.checklistSectionsData || {}),
                photosCount: data.photos?.length || 0,
                observationsContent: data.generalObservations
            });
            
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
            setFormChanged(false);
            setViewMode('form');
            setNotification({ open: true, message: 'Formulario cargado correctamente', severity: 'success' });
            console.log('✅ App: Formulario cargado exitosamente');
        } else {
            console.log('❌ App: No se pudo cargar el formulario');
            setNotification({ open: true, message: 'No se pudo cargar el formulario', severity: 'error' });
            resetForm();
        }
    };

    const resetForm = () => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        console.log('🧹 Iniciando reseteo completo del formulario');
        
        // 🔧 RESETEO COMPLETO: Limpiar todos los estados
        setHeaderData({ fechaVisita: currentDate, horaVisita: currentTime });
        setSignatures({
            'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
            'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
        });
        setGeneralObservations('');
        setChecklistSectionsData({}); 
        setPhotos([]);
        setGeoLocation({});
        
        // 🎯 CLAVE: Resetear tipo de espacio PRIMERO
        setTipoEspacio(''); 
        
        setPuntuacionTotal({ total: 0, promedio: 0, completado: 0, maxPuntosPosibles: 0, porcentajeCumplimiento: 0 });
        setCurrentFormId(null);
        setFormChanged(false);
        
        // 🔧 FORZAR RE-RENDER COMPLETO: Resetear checklist items
        setChecklistItems(getChecklistData('')); // Pasar string vacío para limpiar
        
        // 🔧 FORZAR RE-RENDER: Usar setTimeout para asegurar que el estado se actualice
        setTimeout(() => {
            setChecklistItems(getChecklistData());
            console.log('🧹 Formulario reseteado completamente con re-render forzado');
        }, 100);
    };

    const handleCloseNotification = () => setNotification({ ...notification, open: false });
    const handleHeaderDataChange = (data) => setHeaderData(prev => ({ ...prev, ...data }));
    const handleTipoEspacioChange = (tipo) => setTipoEspacio(tipo);
    const handleSignatureChange = (role, signatureData, checked) => {
        const normalizedRole = role.toLowerCase();
        setSignatures(prev => ({ ...prev, [normalizedRole]: { data: signatureData, checked } }));
    };
    const handleObservationsChange = useCallback((observations) => {
        setGeneralObservations(observations);
    }, []);
    
    const handlePhotosChange = useCallback((newPhotos) => setPhotos(newPhotos), []);
    
    const handleGeoLocationChange = useCallback((location) => setGeoLocation(location), []);
    
    const handleSectionDataChange = useCallback((sectionTitle, sectionDataUpdater) => {
        setChecklistSectionsData(prevState => ({
            ...prevState,
            [sectionTitle]: sectionDataUpdater(prevState[sectionTitle] || {})
        }));
    }, []);

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

    const generatePdf = async () => {
        let syncError = null;
        if (!currentFormId) {
            console.error("No hay formulario activo para finalizar.");
            setNotification({ open: true, message: 'Error: No hay formulario activo para finalizar.', severity: 'error' });
            return;
        }
        
        markFormAsComplete(currentFormId);
        
        // 🔧 MEJORA: Solo sincronizar con Firebase si hay usuario autenticado
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
                lastUpdated: new Date().toISOString() 
            };
            try {
                await saveFormSummary(summaryData); 
                console.log('Formulario completo sincronizado con backend ID:', currentFormId);
            } catch (error) {
                console.error('Error al sincronizar formulario completo en backend:', error);
                syncError = error; 
            }
        }
        
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
        if (generalObservations) {
            if (currentY + 50 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
            doc.setFontSize(14).setFont('helvetica', 'bold').text('Observaciones Generales:', margin, currentY); currentY += 10;
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const textLines = doc.splitTextToSize(generalObservations, pageWidth - (margin * 2));
            doc.text(textLines, margin, currentY);
            currentY += (textLines.length * 7) + 15;
        }
        if (photos && photos.length > 0) {
            if (currentY + 40 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
            doc.setFontSize(14).setFont('helvetica', 'bold').text('Evidencia Fotográfica:', margin, currentY); currentY += 15;
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                if (currentY + 110 > pageHeight - 40) { doc.addPage(); currentY = 40; addHeaderAndFooter(doc); }
                try {
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
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) { doc.setPage(i); addHeaderAndFooter(doc); }
        doc.save(`reporte_${headerData.espacioAtencion || 'supervision'}_${headerData.fechaVisita || 'fecha'}.pdf`);
        
        // 🔧 MEJORA: Notificaciones más claras sobre el estado de sincronización
        if (syncError) {
            setNotification({ open: true, message: 'PDF generado exitosamente. Error al sincronizar con Firebase (se guardó localmente).', severity: 'warning' });
        } else if (user) {
            setNotification({ open: true, message: 'PDF generado y datos sincronizados con Firebase exitosamente.', severity: 'success' });
        } else {
            setNotification({ open: true, message: 'PDF generado exitosamente. Datos guardados localmente (sin sincronización).', severity: 'info' });
        }
        setFormChanged(false);
    };

    const addHeaderAndFooter = (doc) => {
        const pageWidth = doc.internal.pageSize.width; 
        const pageHeight = doc.internal.pageSize.height;
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

    // 🔧 MEJORA: Pantalla de carga que no interfiere con el estado del formulario
    if (!authChecked || authVerifying) {
        return (
            <ThemeProvider theme={theme}>
                <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>
                            {authVerifying ? 'Verificando sesión...' : 'Iniciando aplicación...'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formChanged ? 'Tus datos están seguros en el almacenamiento local' : 'Cargando...'}
                        </Typography>
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
                        <Typography component="h1" variant="h4" gutterBottom align="center">Sistema de Visitas y Supervisión</Typography>
                        <Typography component="h2" variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>Iniciar Sesión</Typography>
                        
                        {/* 🔧 MEJORA: Mostrar información sobre datos locales */}
                        {(currentFormId || formChanged) && (
                            <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
                                Tienes un formulario en progreso guardado localmente. 
                                Puedes continuar trabajando sin iniciar sesión, pero para sincronizar necesitas autenticarte.
                            </Alert>
                        )}
                        
                        <Login onLoginSuccess={handleLoginSuccess} />
                        
                        {/* 🔧 MEJORA: Opción para continuar sin iniciar sesión */}
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                ¿Quieres continuar sin iniciar sesión?
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={() => setViewMode('form')}
                                sx={{ mt: 1 }}
                            >
                                Trabajar sin sincronización
                            </Button>
                        </Box>
                    </Box>
                </Container>
                <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }} variant="filled">{notification.message}</Alert>
                </Snackbar>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="lg">
                <Paper sx={{ position: 'sticky', top: 0, zIndex: 1000, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                          value={viewMode}
                          onChange={(e, newValue) => {
                            // Verificar permisos basados en rol
                            if (newValue === 'dashboard' && userRole === ROLES.APOYO) {
                              setNotification({
                                open: true,
                                message: 'No tienes permiso para acceder al Dashboard',
                                severity: 'warning'
                              });
                              return;
                            }
                            
                            if (newValue === 'admin' && userRole !== ROLES.ADMIN) {
                              setNotification({
                                open: true,
                                message: 'Solo los administradores pueden acceder a este panel',
                                severity: 'warning'
                              });
                              return;
                            }
                            
                            // 🔧 MEJORA: Siempre guardar antes de cambiar de vista
                            if (formChanged && viewMode === 'form') {
                              saveCurrentForm();
                            }
                            setViewMode(newValue);
                          }}
                          sx={{ flexGrow: 1 }}
                        >
                          <Tab label="Formulario Actual" value="form" />
                          <Tab label="Formularios Guardados" value="saved" />
                          {(userRole === ROLES.ADMIN || userRole === ROLES.SUPERVISOR) && (
                            <Tab label="Dashboard" value="dashboard" />
                          )}
                          {userRole === ROLES.ADMIN && (
                            <Tab label="Administración" value="admin" />
                          )}
                        </Tabs>

                        {user && (
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                                <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
                                    {user.email} {userRole && `(${userRole})`}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={async () => {
                                        try {
                                            // 🔧 MEJORA: Guardar antes de cerrar sesión
                                            if (formChanged) {
                                                saveCurrentForm();
                                            }
                                            
                                            await logout();
                                            setUser(null);
                                            setUserRole(null);
                                            setViewMode('form'); 
                                            // 🔧 MEJORA: No resetear formulario al cerrar sesión
                                            // resetForm(); 
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

                {viewMode === 'form' && (
                    <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
                        <Typography variant="h5">{currentFormId ? 'Editando Formulario' : 'Nuevo Formulario'}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            {currentFormId
                                ? `ID: ${currentFormId.substring(0, 8)}... ${formChanged ? '(Cambios sin guardar)' : '(Guardado localmente)'}`
                                : 'Crea un nuevo formulario.'}
                        </Typography>
                        
                        {/* 🔧 MEJORA: Indicador de estado más claro */}
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                backgroundColor: formChanged ? 'warning.main' : 'success.main' 
                            }} />
                            <Typography variant="caption" color="text.secondary">
                                {formChanged ? 'Cambios pendientes de guardar' : 'Todo guardado'}
                            </Typography>
                        </Box>
                        
                        {currentFormId && 
                            <Typography variant="caption" color="textSecondary" display="block">
                                Última act. local: { getFormFromLocalStorage(currentFormId)?.data.lastUpdated ? new Date(getFormFromLocalStorage(currentFormId).data.lastUpdated).toLocaleString() : 'N/A'}
                            </Typography>
                        }
                    </Box>
                )}

                {viewMode === 'form' ? (
                    <Box sx={{ py: 4 }}>
                        <HeaderForm
                            onDataChange={handleHeaderDataChange}
                            initialData={headerData}
                            onTipoEspacioChange={handleTipoEspacioChange}
                        />
                        {(Object.keys(checklistSectionsData).length > 0 || tipoEspacio) && (
                            <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: '#f5f5f5' }}>
                                <Typography variant="h6" gutterBottom>Resumen de Evaluación</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={3}><Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}><Typography variant="body2" color="textSecondary">Puntuación Total</Typography><Typography variant="h4" color="primary" fontWeight="bold">{puntuacionTotal.total}/{puntuacionTotal.maxPuntosPosibles}</Typography><Typography variant="body2" color="textSecondary">({puntuacionTotal.porcentajeCumplimiento}% de cumplimiento)</Typography></Box></Grid>
                                    <Grid item xs={12} md={3}><Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}><Typography variant="body2" color="textSecondary">Promedio General</Typography><Typography variant="h4" fontWeight="bold" sx={{ color: puntuacionTotal.promedio >= 80 ? '#2e7d32' : puntuacionTotal.promedio >= 60 ? '#ed6c02' : '#d32f2f' }}>{puntuacionTotal.promedio}/100</Typography></Box></Grid>
                                    <Grid item xs={12} md={3}><Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}><Typography variant="body2" color="textSecondary">Completado</Typography><Typography variant="h4" color="info.main" fontWeight="bold">{puntuacionTotal.completado}%</Typography></Box></Grid>
                                    <Grid item xs={12} md={3}><Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', border: '1px solid #e0e0e0', textAlign: 'center' }}><Typography variant="body2" color="textSecondary">Tipo de Espacio</Typography><Typography variant="h6" fontWeight="bold">{tipoEspacio === 'cdvfijo' ? 'CDV Fijo' : tipoEspacio === 'cdvparque' ? 'CDV Parque' : 'Sin definir'}</Typography></Box></Grid>
                                </Grid>
                            </Paper>
                        )}
                        <GeoLocationCapture onLocationChange={handleGeoLocationChange} initialData={geoLocation} />
                        {checklistItems.map((section) => (
                            <ChecklistSection 
                                key={`${section.title}-${tipoEspacio}-${currentFormId || 'new'}`} 
                                title={section.title} 
                                items={section.items} 
                                onSectionDataChange={handleSectionDataChange} 
                                initialData={checklistSectionsData[section.title]} 
                            />
                        ))}
                        <SignatureCapture 
                            key={`signature-apoyo-${currentFormId || 'new'}`}
                            label="apoyo a la supervisión quien realiza la visita" 
                            onSignatureChange={handleSignatureChange} 
                            initialData={signatures['apoyo a la supervisión quien realiza la visita']} 
                        />
                        <SignatureCapture 
                            key={`signature-profesional-${currentFormId || 'new'}`}
                            label="profesional/técnico del contratista quien atiende la visita" 
                            onSignatureChange={handleSignatureChange} 
                            initialData={signatures['profesional/técnico del contratista quien atiende la visita']} 
                        />
                        <Observations 
                            key={`observations-${currentFormId || 'new'}`}
                            onObservationsChange={handleObservationsChange} 
                            initialData={generalObservations} 
                        />
                        <PhotoCapture 
                            key={`photos-${currentFormId || 'new'}`}
                            onPhotosChange={handlePhotosChange} 
                            initialData={photos} 
                        />
                        <Box sx={{ mt: 3, pb: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                            <Button 
                                variant="contained" 
                                onClick={() => { if (formChanged) saveCurrentForm(); generatePdf(); }} 
                                sx={{ padding: '10px 30px', fontSize: '1.1rem' }} 
                                disabled={!currentFormId}
                            >
                                Finalizar y Generar PDF
                            </Button>
                            <Button variant="outlined" onClick={saveCurrentForm} sx={{ padding: '10px 30px', fontSize: '1.1rem' }} disabled={!formChanged}>Guardar Localmente</Button>
                        </Box>
                    </Box>
                ) : viewMode === 'saved' ? (
                    <SavedForms onLoadForm={loadSavedForm} user={user} />
                ) : viewMode === 'dashboard' ? (
                    <Dashboard user={user} />
                ) : viewMode === 'admin' ? ( 
                    <AdminPanel user={user} /> 
                ) : null}

                <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }} variant="filled">{notification.message}</Alert>
                </Snackbar>
            </Container>
        </ThemeProvider>
    );
}

export default App;