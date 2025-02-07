import React, { useState, useEffect } from 'react';
import '../styles/forms.css';

const HeaderForm = ({ onDataChange }) => {
    const [formData, setFormData] = useState(() => {
        const savedData = localStorage.getItem('headerData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                return typeof parsedData === 'object' && parsedData !== null ? parsedData : {};
            } catch (error) {
                console.error("Error parsing headerData from localStorage:", error);
                return {};
            }
        }
        return {};
    });

    useEffect(() => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        setFormData(prevData => ({
            ...prevData,
            fechaVisita: currentDate,
            horaVisita: currentTime
        }));
    }, []);

    useEffect(() => {
        return () => {
            try {
                localStorage.setItem('headerData', JSON.stringify(formData));
            } catch (error) {
                console.error("Error stringifying headerData:", error);
            }
        };
    }, [formData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = { ...formData, [name]: value };
        setFormData(updatedFormData);
        onDataChange(updatedFormData);
    };

    const clearForm = () => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const clearedData = {
            fechaVisita: currentDate,
            horaVisita: currentTime
        };

        setFormData(clearedData);
        localStorage.setItem('headerData', JSON.stringify(clearedData));
        onDataChange(clearedData);
    };

    return (
        <div className="form-container">
            <div className="form-header">
                <h2>Visita de supervisión</h2>
                <button 
                    onClick={clearForm}
                    className="clear-button"
                    type="button"
                >
                    Limpiar Formulario
                </button>
            </div>
            <form>
                <div className="form-section">
                    <h3 className="section-title">Información Básica de la Visita</h3>
                    <div className="form-group">
                        <label className="form-label" htmlFor="fechaVisita">Fecha de Visita:</label>
                        <input
                            type="date"
                            className="form-control date-input"
                            id="fechaVisita"
                            name="fechaVisita"
                            value={formData.fechaVisita || ''}
                            onChange={handleChange}
                            readOnly
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="horaVisita">Hora de Visita:</label>
                        <input
                            type="time"
                            className="form-control time-input"
                            id="horaVisita"
                            name="horaVisita"
                            value={formData.horaVisita || ''}
                            onChange={handleChange}
                            readOnly
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="espacioAtencion">Espacio de Atención:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="espacioAtencion"
                            name="espacioAtencion"
                            value={formData.espacioAtencion || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="numeroVisita">Número de Visita:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="numeroVisita"
                            name="numeroVisita"
                            value={formData.numeroVisita || ''}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="section-title">Información del Contratista</h3>
                    <div className="form-group">
                        <label className="form-label" htmlFor="entidadContratista">Entidad Contratista:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="entidadContratista"
                            name="entidadContratista"
                            value={formData.entidadContratista || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="nit">NIT:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="nit"
                            name="nit"
                            value={formData.nit || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="nombreRepresentante">Nombre Representante Legal:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="nombreRepresentante"
                            name="nombreRepresentante"
                            value={formData.nombreRepresentante || ''}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="section-title">Información Operativa</h3>
                    <div className="form-group">
                        <label className="form-label" htmlFor="nombreProfesional">Nombre Profesional quien atiende la visita:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="nombreProfesional"
                            name="nombreProfesional"
                            value={formData.nombreProfesional || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="numeroContrato">Número de Contrato:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="numeroContrato"
                            name="numeroContrato"
                            value={formData.numeroContrato || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="pmAsistentes">PM Asistentes:</label>
                        <input
                            type="number"
                            className="form-control"
                            id="pmAsistentes"
                            name="pmAsistentes"
                            value={formData.pmAsistentes || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="anexos">Anexos:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="anexos"
                            name="anexos"
                            value={formData.anexos || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="nombreSupervisor">Nombre Supervisor:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="nombreSupervisor"
                            name="nombreSupervisor"
                            value={formData.nombreSupervisor || ''}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </form>
        </div>
    );
};

export default HeaderForm;