// src/utils/format.js
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.replace(/(:\d{2}):00$/, '$1');
};

export const formatCurrency = (value) => {
    if (!value) return '$ 0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
    }).format(value);
};

export const formatNumber = (value) => {
    if (!value) return '0';
    return new Intl.NumberFormat('es-CO').format(value);
};

export const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};