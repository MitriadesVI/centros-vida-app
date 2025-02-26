import React, { useState, useEffect } from 'react';
import '../styles/forms.css';
import './HeaderForm.css';

const HeaderForm = ({ onDataChange, initialData = {} }) => {
    const [formData, setFormData] = useState(() => {
        // Si recibimos datos iniciales, los usamos; de lo contrario, intentamos cargar de localStorage
        if (Object.keys(initialData).length > 0) {
            return initialData;
        }
        
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

    // Efecto para establecer fecha y hora si es un formulario nuevo
    useEffect(() => {
        // Solo establecer fecha y hora si es un formulario nuevo (sin datos iniciales)
        if (Object.keys(initialData).length === 0 && (!formData.fechaVisita || !formData.horaVisita)) {
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
        }
    }, [initialData, formData]);

    // Efecto para guardar en localStorage cuando el componente se desmonte
    useEffect(() => {
        return () => {
            try {
                localStorage.setItem('headerData', JSON.stringify(formData));
            } catch (error) {
                console.error("Error stringifying headerData:", error);
            }
        };
    }, [formData]);

    // Efecto para notificar al componente padre de los cambios
    useEffect(() => {
        onDataChange(formData);
    }, [formData, onDataChange]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = { ...formData, [name]: value };
        setFormData(updatedFormData);
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
    };

    return (
        <div className="form-container">
            <div className="form-header">
                <h2 className="form-title">Visita de supervisión</h2>
                <button 
                    onClick={clearForm}
                    className="clear-button"
                    type="button"
                >
                    Limpiar Formulario
                </button>
            </div>
            <form>
                <div className="form-section header-section">
                    <h3 className="section-title">Información de la Visita</h3>
                    <div className="header-form-grid">
                        {/* Fecha y Hora (automáticos) */}
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

                        {/* Espacio de Atención */}
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

                        {/* Nuevo campo: Apoyo a la supervisión */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="apoyoSupervision">Apoyo a la supervisión quien realiza la visita:</label>
                            <input
                                type="text"
                                className="form-control"
                                id="apoyoSupervision"
                                name="apoyoSupervision"
                                value={formData.apoyoSupervision || ''}
                                onChange={handleChange}
                            />
                        </div>

                        {/* #Personas mayores asistentes (antes era pmAsistentes) */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="pmAsistentes">Personas mayores asistentes:</label>
                            <input
                                type="number"
                                className="form-control"
                                id="pmAsistentes"
                                name="pmAsistentes"
                                value={formData.pmAsistentes || ''}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Contratista (antes era entidadContratista) */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="entidadContratista">Contratista:</label>
                            <input
                                type="text"
                                className="form-control"
                                id="entidadContratista"
                                name="entidadContratista"
                                value={formData.entidadContratista || ''}
                                onChange={handleChange}
                            />
                        </div>

                        {/* NIT */}
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

                        {/* No de contrato */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="numeroContrato">No de contrato:</label>
                            <input
                                type="text"
                                className="form-control"
                                id="numeroContrato"
                                name="numeroContrato"
                                value={formData.numeroContrato || ''}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Rep. Legal (antes era nombreRepresentante) */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="nombreRepresentante">Rep. Legal:</label>
                            <input
                                type="text"
                                className="form-control"
                                id="nombreRepresentante"
                                name="nombreRepresentante"
                                value={formData.nombreRepresentante || ''}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Persona quien atiende la visita (antes era nombreProfesional) */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="nombreProfesional">Persona quien atiende la visita:</label>
                            <input
                                type="text"
                                className="form-control"
                                id="nombreProfesional"
                                name="nombreProfesional"
                                value={formData.nombreProfesional || ''}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Supervisor del Distrito (antes era nombreSupervisor) */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="nombreSupervisor">Supervisor del Distrito:</label>
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
                </div>
            </form>
        </div>
    );
};

export default HeaderForm;