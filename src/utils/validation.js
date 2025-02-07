// src/utils/validation.js
export const validateRequired = (value) => {
    return value && value.trim() !== '' ? '' : 'Este campo es requerido';
};

export const validateNumber = (value) => {
    return !isNaN(value) && value > 0 ? '' : 'Debe ser un número válido mayor a 0';
};

export const validateDate = (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) ? '' : 'Fecha inválida';
};

export const validateTime = (value) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value) ? '' : 'Hora inválida';
};

export const validateForm = (values) => {
    const errors = {};
    
    if (!validateRequired(values.fechaVisita)) {
        errors.fechaVisita = validateRequired(values.fechaVisita);
    }
    
    if (!validateRequired(values.numeroVisita)) {
        errors.numeroVisita = validateRequired(values.numeroVisita);
    }
    
    if (!validateRequired(values.entidadContratista)) {
        errors.entidadContratista = validateRequired(values.entidadContratista);
    }
    
    if (values.pmAsistentes && !validateNumber(values.pmAsistentes)) {
        errors.pmAsistentes = validateNumber(values.pmAsistentes);
    }
    
    if (values.horaVisita && !validateTime(values.horaVisita)) {
        errors.horaVisita = validateTime(values.horaVisita);
    }
    
    return errors;
};