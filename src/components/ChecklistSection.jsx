import React, { useState, useEffect } from 'react';
import ChecklistItem from './ChecklistItem';
import '../styles/forms.css';
import './ChecklistSection.css';

const ChecklistSection = ({ title, items, onSectionDataChange, initialData = {} }) => {
    const [sectionData, setSectionData] = useState(initialData || {});
    const [puntuacion, setPuntuacion] = useState({ 
        total: 0, 
        promedio: 0, 
        respondidos: 0, 
        totalItems: items.length,
        maxPuntos: items.length * 100 // Puntos máximos posibles (100 por ítem)
    });

    // Notificar al padre cuando cambian los datos de la sección - CON DEBOUNCE
    useEffect(() => {
        // � DEBOUNCE: Solo actualizar después de 100ms sin cambios para evitar loops infinitos
        const timeoutId = setTimeout(() => {
            onSectionDataChange(title, (prevSectionData) => ({
                ...prevSectionData,
                ...sectionData,
                // Incluir información de puntuación en los datos
                puntuacion: puntuacion
            }));
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [sectionData, puntuacion, title]); // ✅ Con debounce para evitar loops

    // Calcular puntuación cuando cambian los datos
    useEffect(() => {
        let totalPuntos = 0;
        let itemsRespondidos = 0;

        // Recorrer cada item del checklist
        items.forEach(item => {
            const itemData = sectionData[item.id];
            // Solo contar si el valor no es N/A
            if (itemData?.value !== null && itemData?.value !== undefined && itemData?.value !== 'N/A') {
                totalPuntos += Number(itemData.value);
                itemsRespondidos++;
            }
        });

        // Calcular promedio si hay items respondidos
        const promedio = itemsRespondidos > 0 ? totalPuntos / itemsRespondidos : 0;
        const maxPuntos = items.length * 100; // 100 puntos por cada ítem
        const porcentaje = maxPuntos > 0 ? Math.round((totalPuntos / maxPuntos) * 100) : 0;

        setPuntuacion({
            total: totalPuntos,
            promedio: Math.round(promedio), // Redondear a un entero
            respondidos: itemsRespondidos,
            totalItems: items.length,
            maxPuntos: maxPuntos,
            porcentaje: porcentaje
        });
    }, [sectionData, items]);

    const handleItemChange = (itemId, data) => {
        setSectionData(prevData => ({
            ...prevData,
            [itemId]: data
        }));
    };

    return (
        <div className="form-container">
            <div className="form-section">
                <div className="section-header">
                    <h3 className="section-title">{title}</h3>
                    <div className="puntuacion-container">
                        <div className="puntuacion-box">
                            <div className="puntuacion-valor">{puntuacion.total}/{puntuacion.maxPuntos}</div>
                            <div className="puntuacion-label">Puntos</div>
                        </div>
                        <div className="puntuacion-box">
                            <div className="puntuacion-valor">{puntuacion.promedio}/100</div>
                            <div className="puntuacion-label">Promedio</div>
                        </div>
                        <div className="puntuacion-box">
                            <div className="puntuacion-valor">{puntuacion.porcentaje}%</div>
                            <div className="puntuacion-label">Cumplimiento</div>
                        </div>
                        <div className="puntuacion-box">
                            <div className="puntuacion-valor">{puntuacion.respondidos}/{puntuacion.totalItems}</div>
                            <div className="puntuacion-label">Completados</div>
                        </div>
                    </div>
                </div>
                <div className="checklist-items-container">
                    {items.map((item) => (
                        <ChecklistItem
                            key={item.id}
                            id={item.id}
                            number={item.number}
                            label={item.label}
                            onChange={handleItemChange}
                            initialData={sectionData[item.id]}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChecklistSection;