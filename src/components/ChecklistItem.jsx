import React, { useState, useEffect } from 'react';
import './ChecklistItem.css';

const ChecklistItem = ({ id, number, label, onChange, initialData = {} }) => {
    const [selectedValue, setSelectedValue] = useState(initialData?.value || null);
    const [displayText, setDisplayText] = useState(initialData?.displayText || 'N/A');

    // Cuando cambia el valor seleccionado, actualiza los datos y notifica al padre
    useEffect(() => {
        const newData = {
            value: selectedValue,
            displayText: displayText
        };
        
        onChange(id, newData);
    }, [selectedValue, displayText, id, onChange]);

    // Actualiza el texto de visualización cuando cambia el valor seleccionado
    useEffect(() => {
        switch (selectedValue) {
            case 0:
                setDisplayText('0');
                break;
            case 50:
                setDisplayText('50');
                break;
            case 100:
                setDisplayText('100');
                break;
            case 'N/A':
                setDisplayText('N/A');
                break;
            default:
                setDisplayText('N/A');
        }
    }, [selectedValue]);

    const handleValueChange = (e) => {
        const value = e.target.value;
        // Convertir a número si es posible, o mantener como 'N/A'
        const numericValue = value === 'N/A' ? value : parseInt(value, 10);
        setSelectedValue(numericValue);
    };

    return (
        <div className="checklist-item">
            <div className="checklist-item-header">
                <span className="checklist-item-number">{number}.</span>
                <span className="checklist-item-label">{label}</span>
            </div>
            <div className="checklist-item-content">
                <div className="checklist-item-values">
                    <div className="value">
                        <select 
                            value={selectedValue || 'N/A'} 
                            onChange={handleValueChange}
                            className="condition-select"
                        >
                            <option value={0}>0</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value="N/A">N/A</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChecklistItem;