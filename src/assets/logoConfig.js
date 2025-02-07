export const convertImageToBase64 = async () => {
    try {
        const response = await fetch('/membrete distrito.jpg');
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error al convertir la imagen:', error);
        return null;
    }
};