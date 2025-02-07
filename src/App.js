import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import HeaderForm from './components/HeaderForm';
import ChecklistSection from './components/ChecklistSection';
import SignatureField from './components/SignatureField';
import SignatureCapture from './components/SignatureCapture';
import Observations from './components/Observations';
import checklistData from './data';
import './components/ChecklistItem.css';

function App() {
    // Estados principales de la aplicación
    const [headerData, setHeaderData] = useState({});
    const [signatures, setSignatures] = useState({
        supervisor: { data: '', checked: false },
        contratista: { data: '', checked: false },
    });
    const [generalObservations, setGeneralObservations] = useState('');
    const [checklistSectionsData, setChecklistSectionsData] = useState({});

    // Manejadores de eventos para actualizar los estados
    const handleHeaderDataChange = (data) => {
        setHeaderData(data);
    };

    const handleSignatureChange = (role, signatureData, checked) => {
        setSignatures({
            ...signatures,
            [role]: { data: signatureData, checked },
        });
    };

    const handleObservationsChange = (observations) => {
        setGeneralObservations(observations);
    };

    const handleSectionDataChange = (sectionTitle, sectionData) => {
        setChecklistSectionsData({
            ...checklistSectionsData,
            [sectionTitle]: sectionData,
        });
    };

    // Función para generar el PDF
    const generatePdf = () => {
        const doc = new jsPDF();

        // Configuración inicial del documento
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte de Supervisión - Centros de Vida', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        // Datos del encabezado actualizados con el nuevo orden y campos
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

        // Tabla de encabezado
        doc.autoTable({
            head: [['Datos de la Visita', 'Información']],
            body: headerRows,
            startY: 30,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { 
                    fontStyle: 'bold',
                    cellWidth: 100,
                    fillColor: [240, 240, 240]
                },
                1: { 
                    cellWidth: 'auto',
                    halign: 'left'
                }
            }
        });

        // Generación de tablas para cada sección del checklist
        checklistData.forEach(section => {
            const tableData = section.items.map(item => {
                const itemData = checklistSectionsData[section.title]?.[item.id] || {};
                const value = (itemData.value === undefined || itemData.value === "") ? 'N/A' : String(itemData.value);

                return [
                    { content: `${item.number}. ${item.label}`, styles: { fontStyle: 'bold' } },
                    { content: value, styles: { halign: 'right' } },
                ];
            });

            doc.autoTable({
                head: [[section.title, 'Condición']],
                body: tableData,
                startY: doc.lastAutoTable.finalY + 10,
                theme: 'grid',
                columnStyles: {
                    0: { cellWidth: 170 },
                    1: { cellWidth: 20, halign: 'right' },
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 10
                },
                styles: {
                    cellPadding: { top: 5, right: 2, bottom: 5, left: 2 }
                }
            });
        });

        // Sección de firmas en nueva página
        doc.addPage();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Firmas:', 10, 20);

        // Firma del Supervisor
        if (signatures.supervisor.data) {
            doc.addImage(signatures.supervisor.data, 'PNG', 10, 30, 50, 30);
            doc.text('Firma del Supervisor', 10, 70);
        } else {
            doc.text('Firma del Supervisor: No firmado', 10, 40);
        }

        // Firma del Contratista
        if (signatures.contratista.data) {
            doc.addImage(signatures.contratista.data, 'PNG', 10, 80, 50, 30);
            doc.text('Firma del Contratista', 10, 120);
        } else {
            doc.text('Firma del Contratista: No firmado', 10, 90);
        }

        // Sección de observaciones generales
        if (generalObservations) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Observaciones Generales:', 10, doc.lastAutoTable.finalY + 10);
            doc.setFont('helvetica', 'normal');
            const observationLines = doc.splitTextToSize(generalObservations, 190);
            doc.text(observationLines, 10, doc.lastAutoTable.finalY + 17);
        }

        // Guardar el PDF
        doc.save('reporte-supervision.pdf');
    };

    // Renderizado del componente
    return (
        <div className="App">
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
                onSignatureChange={(role, data, checked) => 
                    handleSignatureChange('apoyo a la supervisión quien realiza la visita', data, checked)} 
            />
            <SignatureCapture 
                label="Profesional/técnico del contratista quien atiende la visita" 
                onSignatureChange={(role, data, checked) => 
                    handleSignatureChange('Profesional/técnico del contratista quien atiende la visita', data, checked)} 
            />
            <Observations onObservationsChange={handleObservationsChange} />
            <button onClick={generatePdf}>Generar PDF</button>
        </div>
    );
}

export default App;