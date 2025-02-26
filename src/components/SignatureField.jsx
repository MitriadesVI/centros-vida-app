import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import '../styles/forms.css';

const SignatureField = forwardRef(({ onChange, initialData = '' }, ref) => {
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const contextRef = useRef(null);
    const prevPointRef = useRef(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // Permitir al componente padre acceder a funciones internas
    useImperativeHandle(ref, () => ({
        clear: () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            onChange(''); // Notificar que la firma ha sido borrada
            setIsImageLoaded(false);
        }
    }));

    // Configurar el canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Establecer un tamaño máximo para evitar firmas demasiado grandes
        const maxWidth = 400; // Ancho máximo en píxeles
        const maxHeight = 200; // Alto máximo en píxeles
        
        const container = canvas.parentElement;
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        
        // Calcular el ancho real respetando el máximo
        const actualWidth = Math.min(containerWidth, maxWidth);
        
        // Aplicar las dimensiones
        canvas.style.width = `${actualWidth}px`;
        canvas.style.height = `${maxHeight}px`;
        
        // Ajustar el tamaño real del canvas (para mayor resolución)
        canvas.width = actualWidth * 2;
        canvas.height = maxHeight * 2;
        
        const context = canvas.getContext('2d');
        context.scale(2, 2); // Para retina displays
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        
        contextRef.current = context;
        
        // Si hay datos iniciales, cargarlos con manejo de errores
        if (initialData && typeof initialData === 'string' && initialData.startsWith('data:')) {
            const img = new Image();
            
            img.onload = () => {
                setIsImageLoaded(true);
                
                // Limpiar el canvas antes de dibujar
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Calcular proporciones para ajustar la imagen
                const imgRatio = img.width / img.height;
                const canvasRatio = (canvas.width/2) / (canvas.height/2);
                
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
                
                if (imgRatio > canvasRatio) {
                    // La imagen es más ancha proporcionalmente
                    drawWidth = canvas.width / 2;
                    drawHeight = (canvas.width/2) / imgRatio;
                    offsetY = ((canvas.height/2) - drawHeight) / 2;
                } else {
                    // La imagen es más alta proporcionalmente
                    drawHeight = canvas.height / 2;
                    drawWidth = (canvas.height/2) * imgRatio;
                    offsetX = ((canvas.width/2) - drawWidth) / 2;
                }
                
                context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            };
            
            img.onerror = () => {
                console.error("Error al cargar la imagen de firma");
                setIsImageLoaded(false);
                // No haga nada si hay un error, mantenga el canvas vacío
            };
            
            img.src = initialData;
        }
        
    }, [initialData]);

    const startDrawing = ({ nativeEvent }) => {
        if (!contextRef.current) return;
        
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        prevPointRef.current = { x: offsetX, y: offsetY };
        isDrawingRef.current = true;
        
        // Si había una imagen cargada, ahora estamos dibujando encima
        if (isImageLoaded) {
            setIsImageLoaded(false);
        }
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawingRef.current || !contextRef.current) return;
        
        const { offsetX, offsetY } = nativeEvent;
        const currentPoint = { x: offsetX, y: offsetY };
        const { x: currX, y: currY } = currentPoint;
        const { x: prevX, y: prevY } = prevPointRef.current;
        
        // Dibujar línea
        contextRef.current.beginPath();
        contextRef.current.moveTo(prevX, prevY);
        contextRef.current.lineTo(currX, currY);
        contextRef.current.stroke();
        
        prevPointRef.current = currentPoint;
    };

    const stopDrawing = () => {
        if (isDrawingRef.current && contextRef.current && canvasRef.current) {
            contextRef.current.closePath();
            isDrawingRef.current = false;
            
            // Convertir firma a imagen con manejo de errores
            try {
                const signatureData = canvasRef.current.toDataURL('image/png');
                onChange(signatureData);
            } catch (err) {
                console.error("Error al convertir la firma a imagen:", err);
            }
        }
    };

    // Manejar eventos táctiles con validaciones
    const handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches && e.touches[0] && canvasRef.current) {
            const touch = e.touches[0];
            const rect = canvasRef.current.getBoundingClientRect();
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;
            
            startDrawing({ nativeEvent: { offsetX, offsetY } });
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches && e.touches[0] && canvasRef.current) {
            const touch = e.touches[0];
            const rect = canvasRef.current.getBoundingClientRect();
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;
            
            draw({ nativeEvent: { offsetX, offsetY } });
        }
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        stopDrawing();
    };

    return (
        <div className="signature-field-container">
            <canvas
                ref={canvasRef}
                className="signature-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />
            {!isImageLoaded && !isDrawingRef.current && (
                <div className="signature-placeholder">
                    Firme aquí
                </div>
            )}
        </div>
    );
});

export default SignatureField;