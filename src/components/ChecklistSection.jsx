import React, { useState } from 'react';

const ChecklistSection = ({ title, items, onSectionDataChange }) => {
  const [sectionData, setSectionData] = useState({});

  const handleValueChange = (itemId, value) => {
    const newSectionData = {
      ...sectionData,
      [itemId]: { value }
    };
    setSectionData(newSectionData);
    onSectionDataChange(title, newSectionData);
  };

  const getScoreColor = (value) => {
    switch (value) {
      case '100': return 'bg-green-100 text-green-800';
      case '50': return 'bg-yellow-100 text-yellow-800';
      case '0': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!items || !Array.isArray(items)) return null;

  return (
    <div className="mb-6 bg-white rounded-lg shadow">
      <div className="px-6 py-4 bg-gray-50 border-b rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 mb-2 font-semibold text-sm text-gray-700 pb-2 border-b">
            <div className="col-span-9">Criterio a verificar</div>
            <div className="col-span-3">Condición</div>
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg items-center border-b">
              <div className="col-span-9">
                <label className="text-sm font-medium text-gray-700">
                  {item.label}
                </label>
              </div>
              <div className="col-span-3">
                <select 
                  className={`px-3 py-2 rounded-md border shadow-sm w-full 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 
                    ${getScoreColor(sectionData[item.id]?.value)}`}
                  value={sectionData[item.id]?.value || ''}
                  onChange={(e) => handleValueChange(item.id, e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  <option value="100">100%</option>
                  <option value="50">50%</option>
                  <option value="0">0%</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChecklistSection;