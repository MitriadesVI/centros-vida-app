// src/utils/pdf/generateReport.js
import { jsPDF } from 'jspdf';

export const generateReport = (data) => {
  const {
    headerData,
    checklistData,
    signatures,
    observations
  } = data;

  const doc = new jsPDF();
  
  // Configuración inicial
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de Supervisión - Centros de Vida', 105, 20, { align: 'center' });
  
  // Función helper para agregar texto
  const addText = (text, x, y, options = {}) => {
    const {
      fontSize = 12,
      fontStyle = 'normal',
      align = 'left',
      color = '#000000'
    } = options;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color);
    doc.text(text, x, y, { align });
  };

  // Agregar datos del encabezado
  let yOffset = 40;
  Object.entries(headerData).forEach(([key, value]) => {
    addText(`${key}: ${value || 'N/A'}`, 10, yOffset);
    yOffset += 7;
  });

  // Agregar datos del checklist
  checklistData.forEach(section => {
    yOffset += 10;
    addText(section.title, 10, yOffset, { fontStyle: 'bold', fontSize: 14 });
    yOffset += 7;

    section.items.forEach(item => {
      const response = item.value || 'N/A';
      addText(`${item.label}: ${response}`, 15, yOffset);
      yOffset += 7;

      if (item.observations) {
        addText(`Observaciones: ${item.observations}`, 20, yOffset, { 
          fontSize: 10,
          color: '#666666'
        });
        yOffset += 7;
      }

      // Nueva página si es necesario
      if (yOffset > 280) {
        doc.addPage();
        yOffset = 20;
      }
    });
  });

  // Agregar firmas
  yOffset += 10;
  addText('Firmas', 10, yOffset, { fontStyle: 'bold' });
  yOffset += 7;
  Object.entries(signatures).forEach(([role, { name, checked }]) => {
    addText(`${role}: ${checked ? name : 'No firmado'}`, 10, yOffset);
    yOffset += 7;
  });

  // Agregar observaciones generales
  if (observations) {
    yOffset += 10;
    addText('Observaciones Generales', 10, yOffset, { fontStyle: 'bold' });
    yOffset += 7;
    addText(observations, 10, yOffset);
  }

  return doc;
};

export default generateReport;