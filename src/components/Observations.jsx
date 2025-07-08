import React, { useState, useEffect } from 'react';
import '../styles/forms.css';

const Observations = ({ onObservationsChange, initialData = '' }) => {
    const [observations, setObservations] = useState(initialData);

    // Inicializar con datos iniciales si los hay
    useEffect(() => {
        if (initialData && initialData !== observations) {
            setObservations(initialData);
            console.log('📝 Observations: Datos iniciales cargados:', initialData);
        }
    }, [initialData, observations]);

    useEffect(() => {
        // Notificar al componente padre cuando las observaciones cambien
        onObservationsChange(observations);
        console.log('📝 Observations: Cambio detectado, notificando al padre:', observations);
    }, [observations, onObservationsChange]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setObservations(newValue);
        console.log('📝 Observations: Usuario escribió:', newValue);
    };

    return (
        <div className="form-container">
            <div className="form-section observations-section">
                <h3 className="section-title">Observaciones Generales</h3>
                <div className="form-group">
                    <textarea
                        className="form-control observations-textarea"
                        id="observations"
                        name="observations"
                        rows="6"
                        value={observations}
                        onChange={handleChange}
                        placeholder="Escriba aquí sus observaciones generales sobre la visita. Incluya detalles de aspectos específicos de los ítems evaluados si es necesario."
                    ></textarea>
                </div>
                <p className="help-text">
                    Use este espacio para registrar todas las observaciones relevantes de la visita, 
                    incluyendo cualquier comentario específico sobre los ítems evaluados.
                </p>
            </div>
        </div>
    );
};

export default Observations;