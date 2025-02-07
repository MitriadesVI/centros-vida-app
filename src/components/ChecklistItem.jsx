import React, { useState } from 'react';

const ChecklistItem = ({ id, label, onItemChange }) => {
  const [value, setValue] = useState('');

  const handleValueChange = (e) => {
    setValue(e.target.value);
    onItemChange(id, e.target.value, ""); // Pasamos directamente la cadena vacia.
  };



  return (
    <div className='checklist-item'>
        <label className='checklist-label'>{label}:</label>
        <div className='selection-container'>
            <label>Condición:</label>
            <select className='select-input' value={value} onChange={handleValueChange}>
                <option value="">Seleccionar</option>
                <option value="100">100</option>
                <option value="50">50</option>
                <option value="0">0</option>
            </select>
        </div>
    </div>
  );
};

export default ChecklistItem;