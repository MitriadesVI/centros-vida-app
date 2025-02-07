import React, { useState } from 'react';
import '../styles/forms.css';

const Observations = ({ onObservationsChange }) => {
    const [observations, setObservations] = useState('');

    const handleObservationsChange = (e) => {
        setObservations(e.target.value);
        onObservationsChange(e.target.value);
    };

    return (
        <div className="form-group observations-section">
            <h3>Observaciones Generales</h3>
            <textarea
                className="form-control"
                value={observations}
                onChange={handleObservationsChange}
                placeholder="Ingrese las observaciones generales aquí"
                rows="4"
            />
        </div>
    );
};

export default Observations;