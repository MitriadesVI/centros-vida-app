import React, { useState, useEffect } from 'react';
import ChecklistItem from './ChecklistItem';
import '../styles/forms.css';

const ChecklistSection = ({ title, items, onSectionDataChange, initialData = {} }) => {
    const [sectionData, setSectionData] = useState(initialData || {});

    // Notificar al padre cuando cambian los datos de la sección
    useEffect(() => {
        onSectionDataChange(title, (prevSectionData) => ({
            ...prevSectionData,
            ...sectionData
        }));
    }, [sectionData, title, onSectionDataChange]);

    const handleItemChange = (itemId, data) => {
        setSectionData(prevData => ({
            ...prevData,
            [itemId]: data
        }));
    };

    return (
        <div className="form-container">
            <div className="form-section">
                <h3 className="section-title">{title}</h3>
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