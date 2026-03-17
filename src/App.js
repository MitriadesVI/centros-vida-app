import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Container, Box, Button, Snackbar, Alert, Typography, Tab, Tabs, Paper, Grid, Chip } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- IMPORTACIONES DE SERVICIOS Y COMPONENTES ---
// Servicios de autenticación (manteniendo los que no cambian)
import { onAuthChange, logout } from './services/authService'; 
// Servicios de roles de usuario (actualizados/nuevos)
import { getUserRole, getUserProfile, ROLES, updateLastLogin } from './services/userRoleService'; // << NUEVA IMPORTACIÓN / ACTUALIZADA
import { saveFormSummary } from './services/formDataService'; 
import Login from './components/Login'; 
import Dashboard from './components/dashboard/Dashboard'; 
import AdminPanel from './components/admin/AdminPanel'; // << NUEVA IMPORTACIÓN
import CatalogosPanel from './components/catalogos/CatalogosPanel';
import PlanificacionPanel from './components/planificacion/PlanificacionPanel';

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

// Nuevos servicios de base de datos IndexedDB
import {
    saveFormAsDraft,
    getForm,
    finalizeForm,
    updateFormSyncStatus,
    saveUserSession,    // << AÑADIR
    getUserSession,     // << AÑADIR
    clearUserSession    // << AÑADIR
} from './services/dbService'; // << NUEVA IMPORTACIÓN

function App() {
    const AUTO_SAVE_DELAY_MS = 1800;
    const AUTO_SAVE_ENABLED = false;

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
    const [currentFormLastUpdated, setCurrentFormLastUpdated] = useState(null); // << Nuevo estado para trackear última actualización
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    const [localSaveStatus, setLocalSaveStatus] = useState('saved');
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    const suppressDirtyTrackingRef = useRef(false);
    const suppressChecklistResetRef = useRef(false);
    const changeVersionRef = useRef(0);

    // 🔧 MEJORA: Estado para manejar verificaciones de sesión sin perder datos
    // const [authVerifying, setAuthVerifying] = useState(false); // Ya no necesario con arranque instantáneo

    // Detecta cambios de conectividad sin tocar el backend.
    useEffect(() => {
        const updateConnectionStatus = () => {
            setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
        };

        updateConnectionStatus();
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);

        return () => {
            window.removeEventListener('online', updateConnectionStatus);
            window.removeEventListener('offline', updateConnectionStatus);
        };
    }, []);

    // 🔧 NUEVA IMPLEMENTACIÓN: Arranque instantáneo con sesión local + Firebase en paralelo
    useEffect(() => {
        let unsubscribe = () => {}; // Variable declarada fuera
        const initializeApp = async () => {
            // 1. Intentamos obtener una sesión local primero
            const localSession = await getUserSession();

            if (localSession) {
                // 2. Si existe una sesión local, cargamos la app INMEDIATAMENTE
                console.log('🚀 Usando sesión local para arranque instantáneo.');
                setUser({ uid: localSession.uid, email: localSession.email, nombre: localSession.nombre || '' });
                setUserRole(localSession.role);
                setAuthChecked(true); // ¡La app ya no espera!
            }

            // 3. En paralelo (o si no hay sesión local), nos suscribimos a Firebase
            // para actualizar el estado o manejar el primer login.
            unsubscribe = onAuthChange(async (firebaseUser) => { // Se asigna a la variable externa
                if (firebaseUser) {
                    // Si hay un usuario de Firebase, refrescamos los datos por si han cambiado
                    const role = await getUserRole(firebaseUser.uid);
                    if (!role) {
                        await logout();
                        await clearUserSession();
                        setUser(null);
                        setUserRole(null);
                        setNotification({
                            open: true,
                            message: 'Acceso denegado. Contacte al administrador.',
                            severity: 'error'
                        });
                    } else {
                        const profile = await getUserProfile(firebaseUser.uid);
                        const nombre = profile?.nombre || '';
                        setUser({ ...firebaseUser, nombre });
                        setUserRole(role);
                        // Aseguramos que la sesión local esté siempre actualizada
                        await saveUserSession({ uid: firebaseUser.uid, email: firebaseUser.email, role, nombre });
                    }
                } else {
                    // Si no hay usuario en Firebase (sesión expirada, etc.), limpiamos todo.
                    await clearUserSession();
                    setUser(null);
                    setUserRole(null);
                }

                // Si no teníamos sesión local, marcamos la app como lista ahora
                if (!localSession) {
                    setAuthChecked(true);
                }
            });
        };

        initializeApp();
        return () => unsubscribe(); // Se devuelve la función de limpieza directamente
    }, []); // Se ejecuta solo una vez al montar el componente

    const buildLocalDraftData = useCallback(() => ({
        headerData: JSON.parse(JSON.stringify(headerData)),
        signatures: JSON.parse(JSON.stringify(signatures)),
        generalObservations,
        checklistSectionsData: JSON.parse(JSON.stringify(checklistSectionsData)),
        photos: JSON.parse(JSON.stringify(photos)),
        geoLocation: JSON.parse(JSON.stringify(geoLocation)),
        tipoEspacio,
        puntuacionTotal: JSON.parse(JSON.stringify(puntuacionTotal))
    }), [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, tipoEspacio, puntuacionTotal]);

    // Marca cambios del formulario sin dispararse al cargar borradores existentes.
    useEffect(() => {
        if (suppressDirtyTrackingRef.current) {
            suppressDirtyTrackingRef.current = false;
            return;
        }

        const hasHeaderData = Object.keys(headerData).length > 2;
        const hasObservations = generalObservations && generalObservations.trim().length > 0;
        const hasChecklistData = Object.keys(checklistSectionsData).length > 0;
        const hasPhotos = photos.length > 0;
        const hasSignatures = Object.keys(signatures).some(k => signatures[k].data);
        const hasGeoLocation = Object.keys(geoLocation).length > 0;
        const hasTipoEspacio = Boolean(tipoEspacio);
        const hasData = hasHeaderData || hasObservations || hasChecklistData || hasPhotos || hasSignatures || hasGeoLocation || hasTipoEspacio;

        if (hasData) {
            changeVersionRef.current += 1;
            setFormChanged(true);
            setLocalSaveStatus(prevStatus => prevStatus === 'saving' ? prevStatus : 'dirty');
        } else {
            setFormChanged(false);
            setLocalSaveStatus('saved');
        }
    }, [headerData, signatures, generalObservations, checklistSectionsData, photos, geoLocation, tipoEspacio]);

    // Solo autoguardamos en IndexedDB; Firebase queda para la sincronización explícita.
    const saveDraftLocally = useCallback(async ({ showNotification = false } = {}) => {
        if (!formChanged) {
            if (showNotification) {
                setNotification({ open: true, message: 'No hay cambios para guardar', severity: 'info' });
            }
            return currentFormId;
        }

        const changeVersionAtSaveStart = changeVersionRef.current;
        setLocalSaveStatus('saving');

        try {
            const formData = buildLocalDraftData();
            const savedId = await saveFormAsDraft(formData, currentFormId);
            const savedAt = new Date().toISOString();

            if (savedId && currentFormId !== savedId) {
                setCurrentFormId(savedId);
            }

            setCurrentFormLastUpdated(savedAt);

            if (changeVersionRef.current !== changeVersionAtSaveStart) {
                setLocalSaveStatus('dirty');
                return savedId;
            }

            setFormChanged(false);
            setLocalSaveStatus('saved');

            if (showNotification) {
                setNotification({ open: true, message: 'Borrador guardado localmente', severity: 'success' });
            }

            return savedId;
        } catch (error) {
            console.error("❌ App: Error en guardado local:", error);
            setLocalSaveStatus('error');

            if (showNotification) {
                setNotification({ open: true, message: 'Error al guardar el borrador', severity: 'error' });
            }

            throw error;
        }
    }, [buildLocalDraftData, currentFormId, formChanged]);

    useEffect(() => {
        if (!AUTO_SAVE_ENABLED || !formChanged || localSaveStatus !== 'dirty') {
            return undefined;
        }

        const autoSaveTimer = setTimeout(() => {
            saveDraftLocally().catch((error) => {
                console.error('❌ App: Error en autoguardado local:', error);
            });
        }, AUTO_SAVE_DELAY_MS);

        return () => clearTimeout(autoSaveTimer);
    }, [AUTO_SAVE_DELAY_MS, AUTO_SAVE_ENABLED, formChanged, localSaveStatus, saveDraftLocally]);

    // Efecto para manejar cambios en el tipo de espacio y contratista
    useEffect(() => {
        const shouldSkipChecklistReset = suppressChecklistResetRef.current;
        if (suppressChecklistResetRef.current) {
            suppressChecklistResetRef.current = false;
        }

        // Ahora pasamos también el nombre del contratista desde headerData
        const newChecklist = getChecklistData(tipoEspacio, headerData.entidadContratista); // << MODIFICADO
        setChecklistItems(newChecklist);
        
        // Reseteamos los datos del checklist si el tipo de espacio o el contratista cambian
        if (!shouldSkipChecklistReset && (tipoEspacio || headerData.entidadContratista)) {
            setChecklistSectionsData({});
        }
    }, [tipoEspacio, headerData.entidadContratista]); // << MODIFICADO

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
        // Ahora pasamos también el nombre del contratista desde headerData
        const maxPuntosPosibles = getMaxPuntosPosibles(tipoEspacio, headerData.entidadContratista); // << MODIFICADO
        const porcentajeCumplimiento = maxPuntosPosibles > 0 ? Math.round((totalPuntos / maxPuntosPosibles) * 100) : 0;
        const completado = totalItemsCalculado > 0 ? Math.round((itemsRespondidos / totalItemsCalculado) * 100) : 0;
        setPuntuacionTotal({ total: totalPuntos, promedio, completado, maxPuntosPosibles, porcentajeCumplimiento });
    }, [checklistSectionsData, checklistItems, tipoEspacio, headerData.entidadContratista]); // << MODIFICADO

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
          const profile = await getUserProfile(loggedInUser.uid);
          const nombre = profile?.nombre || '';
          setUser({ ...loggedInUser, nombre });
          setUserRole(role);
          await updateLastLogin(loggedInUser.uid);
          await saveUserSession({ uid: loggedInUser.uid, email: loggedInUser.email, role, nombre });
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

    const saveCurrentForm = async () => {
        try {
            return await saveDraftLocally({ showNotification: true });
        } catch (error) {
            console.error("❌ App: Error en guardado local manual:", error);
        }
    };

    const loadSavedForm = async (formId) => { // << AHORA ES ASYNC
        console.log('📂 App: Intentando cargar formulario:', formId);
        if (!formId) { 
            console.log('📂 App: No hay formId, reseteando formulario');
            resetForm(); 
            setViewMode('form'); 
            return; 
        }
        
        // << CAMBIO PRINCIPAL: Ahora usamos getForm de IndexedDB
        const savedForm = await getForm(formId);
        console.log('📂 App: Formulario recuperado de IndexedDB:', savedForm);
        
        if (savedForm) {
            suppressDirtyTrackingRef.current = true;
            suppressChecklistResetRef.current = true;
            // La estructura de datos es directa ahora, no hay wrapper 'data'
            console.log('📂 App: Cargando datos del formulario:', {
                headerKeys: Object.keys(savedForm.headerData || {}),
                observationsLength: savedForm.generalObservations?.length || 0,
                checklistSections: Object.keys(savedForm.checklistSectionsData || {}),
                photosCount: savedForm.photos?.length || 0,
                observationsContent: savedForm.generalObservations
            });
            
            setHeaderData(savedForm.headerData || {});
            setSignatures(savedForm.signatures || {
                'apoyo a la supervisión quien realiza la visita': { data: '', checked: false },
                'profesional/técnico del contratista quien atiende la visita': { data: '', checked: false },
            });
            setGeneralObservations(savedForm.generalObservations || '');
            setChecklistSectionsData(savedForm.checklistSectionsData || {});
            setPhotos(savedForm.photos || []);
            setGeoLocation(savedForm.geoLocation || {});
            setTipoEspacio(savedForm.tipoEspacio || '');
            setPuntuacionTotal(savedForm.puntuacionTotal || { total: 0, promedio: 0, completado: 0, maxPuntosPosibles: 0, porcentajeCumplimiento: 0 });
            setCurrentFormId(formId);
            setCurrentFormLastUpdated(savedForm.lastUpdated); // << Actualizar timestamp desde el formulario cargado
            setFormChanged(false);
            setLocalSaveStatus('saved');
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
        suppressDirtyTrackingRef.current = true;
        
        // 🔧 RESETEO COMPLETO: Limpiar todos los estados
        setHeaderData({ fechaVisita: currentDate, horaVisita: currentTime, apoyoSupervision: user?.nombre || '' });
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
        setCurrentFormLastUpdated(null); // << Limpiar timestamp al resetear
        setFormChanged(false);
        setLocalSaveStatus('saved');
        
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

    const generatePdf = async (formIdToFinalize = currentFormId) => {
        let syncError = null;
        let remoteDocId = null;
        if (!formIdToFinalize) {
            console.error("No hay formulario activo para finalizar.");
            setNotification({ open: true, message: 'Error: No hay formulario activo para finalizar.', severity: 'error' });
            return;
        }
        
        // << CAMBIO CLAVE: AHORA MARCAMOS EL FORMULARIO COMO FINALIZADO EN INDEXEDDB
        await finalizeForm(formIdToFinalize);
        
        // 🔧 MEJORA: Solo sincronizar con Firebase si hay usuario autenticado
        if (user) {
            const summaryData = {
                formId: formIdToFinalize,
                localFormId: formIdToFinalize,
                userId: user.uid || user.id,
                userEmail: user.email,
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
                // Incluimos observaciones en el resumen remoto sin tocar el flujo del PDF.
                observacionesGenerales: generalObservations || '',
                puntuacionTotal: {
                    total: puntuacionTotal.total, promedio: puntuacionTotal.promedio, completado: puntuacionTotal.completado,
                    maxPuntosPosibles: puntuacionTotal.maxPuntosPosibles, porcentajeCumplimiento: puntuacionTotal.porcentajeCumplimiento
                },
                checklistSectionsData: checklistSectionsData,
                isComplete: true,
                userid: user.uid || user.id,
                lastUpdated: new Date().toISOString() 
            };
            try {
                remoteDocId = await saveFormSummary(summaryData);
                await updateFormSyncStatus(formIdToFinalize, 'synced', { remoteDocId });
                console.log('Formulario completo sincronizado con backend ID:', formIdToFinalize);

                try {
                    const { buscarTareaPendienteParaVisita, completarTarea } = await import('./services/tareasService');
                    const tareaId = await buscarTareaPendienteParaVisita(
                        headerData.espacioAtencion,
                        headerData.fechaVisita,
                        user.uid
                    );

                    if (tareaId) {
                        await completarTarea(tareaId, remoteDocId || formIdToFinalize);
                        console.log('Tarea cerrada automáticamente:', tareaId);
                    }
                } catch (taskClosingError) {
                    console.warn('No se pudo cerrar tarea automáticamente:', taskClosingError);
                }
            } catch (error) {
                console.error('Error al sincronizar formulario completo en backend:', error);
                await updateFormSyncStatus(formIdToFinalize, 'sync_error', {
                    lastSyncError: error.message || 'Error al sincronizar con Firebase'
                });
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

    const localSaveStatusConfig = {
        dirty: { label: 'Guardado local: dirty', color: 'warning' },
        saving: { label: 'Guardado local: saving', color: 'info' },
        saved: { label: 'Guardado local: saved', color: 'success' },
        error: { label: 'Guardado local: error', color: 'error' }
    };
    const currentLocalSaveStatus = localSaveStatusConfig[localSaveStatus] || localSaveStatusConfig.saved;

    // 🔧 MEJORA: Pantalla de carga simplificada (arranque instantáneo con sesión local)
    if (!authChecked) {
        return (
            <ThemeProvider theme={theme}>
                <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>
                            Iniciando aplicación...
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
                          variant="scrollable"
                          scrollButtons="auto"
                          allowScrollButtonsMobile
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

                            if (newValue === 'catalogos' && userRole !== ROLES.ADMIN && userRole !== ROLES.SUPERVISOR) {
                              setNotification({
                                open: true,
                                message: 'Solo administradores y supervisores pueden acceder a los catálogos',
                                severity: 'warning'
                              });
                              return;
                            }
                            
                            // 🔧 MEJORA: Siempre guardar antes de cambiar de vista
                            if (formChanged && viewMode === 'form' && localSaveStatus !== 'saving') {
                              void saveCurrentForm();
                            }
                            setViewMode(newValue);
                          }}
                          sx={{ flexGrow: 1, minWidth: 0 }}
                        >
                          <Tab label="Formulario Actual" value="form" />
                          <Tab label="Formularios Guardados" value="saved" />
                          {(userRole === ROLES.ADMIN || userRole === ROLES.SUPERVISOR) && (
                            <Tab label="Dashboard" value="dashboard" />
                          )}
                          {userRole === ROLES.ADMIN && (
                            <Tab label="Administración" value="admin" />
                          )}
                          {(userRole === ROLES.ADMIN || userRole === ROLES.SUPERVISOR) && (
                            <Tab label="Catálogos" value="catalogos" />
                          )}
                          <Tab label="Planificación" value="planificacion" />
                        </Tabs>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <Chip
                                size="small"
                                color={isOnline ? 'success' : 'warning'}
                                label={`Conexión: ${isOnline ? 'online' : 'offline'}`}
                                variant={isOnline ? 'filled' : 'outlined'}
                            />
                            {viewMode === 'form' && (
                                <Chip
                                    size="small"
                                    color={currentLocalSaveStatus.color}
                                    label={currentLocalSaveStatus.label}
                                    variant={localSaveStatus === 'saved' ? 'filled' : 'outlined'}
                                />
                            )}
                            {user && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
                                        {user.email} {userRole && `(${userRole})`}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        disabled={localSaveStatus === 'saving'}
                                        onClick={async () => {
                                            try {
                                                if (formChanged && localSaveStatus !== 'saving') {
                                                    await saveCurrentForm();
                                                }

                                                localStorage.removeItem('headerData');
                                                localStorage.clear();
                                                resetForm();

                                                await clearUserSession();
                                                await logout();
                                                setUser(null);
                                                setUserRole(null);
                                                setViewMode('form');
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
                    </Box>
                </Paper>

                {viewMode === 'form' && (
                    <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
                        <Typography variant="h5">{currentFormId ? 'Editando Formulario' : 'Nuevo Formulario'}</Typography>
                        
                        <Typography variant="body2" color="textSecondary">
                            {currentFormId
                                // << LA CORRECCIÓN CLAVE ESTÁ AQUÍ >>
                                ? `ID: ${currentFormId.toString().substring(0, 8)}...` 
                                : 'Crea un nuevo formulario.'}
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Autoguardado local activo en este dispositivo.
                        </Typography>

                        {currentFormId && 
                            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                Última act. local: {currentFormLastUpdated ? new Date(currentFormLastUpdated).toLocaleString('es-CO') : 'N/A'}
                            </Typography>
                        }
                    </Box>
                )}

                {viewMode === 'form' ? (
                    <Box sx={{ py: 4 }}>
                        <HeaderForm
                            key={`header-${currentFormId || 'new'}`}
                            onDataChange={handleHeaderDataChange}
                            initialData={headerData}
                            onTipoEspacioChange={handleTipoEspacioChange}
                            userName={user?.nombre || ''}
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
                        <GeoLocationCapture
                            key={`geo-${currentFormId || 'new'}`}
                            onLocationChange={handleGeoLocationChange}
                            initialData={geoLocation}
                        />
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
                                onClick={async () => {
                                    // Aseguramos que se guarde y se obtenga un ID antes de continuar
                                    const activeFormId = (formChanged || !currentFormId)
                                        ? await saveCurrentForm()
                                        : currentFormId;
                                    if (!activeFormId) return;
                                    // La generación del PDF ahora espera a que el guardado termine
                                    await generatePdf(activeFormId);
                                }}
                                sx={{ padding: '10px 30px', fontSize: '1.1rem' }}
                                disabled={localSaveStatus === 'saving'}
                            >
                                {localSaveStatus === 'saving' ? 'Guardando...' : 'Finalizar y Generar PDF'}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={saveCurrentForm}
                                sx={{ padding: '10px 30px', fontSize: '1.1rem' }}
                                disabled={!formChanged || localSaveStatus === 'saving'}
                            >
                                {localSaveStatus === 'saving' ? 'Guardando...' : 'Guardar Localmente'}
                            </Button>
                        </Box>
                    </Box>
                ) : viewMode === 'saved' ? (
                    <SavedForms onLoadForm={loadSavedForm} user={user} />
                ) : viewMode === 'dashboard' ? (
                    <Dashboard user={user} />
                ) : viewMode === 'admin' ? (
                    <AdminPanel user={user} />
                ) : viewMode === 'catalogos' ? (
                    <CatalogosPanel user={user} />
                ) : viewMode === 'planificacion' ? (
                    <PlanificacionPanel user={user} />
                ) : null}

                <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }} variant="filled">{notification.message}</Alert>
                </Snackbar>
            </Container>
        </ThemeProvider>
    );
}

export default App;
