import React, { useRef, useState, useEffect } from 'react';
import './SignatureCapture.css';

const SignatureCapture = ({ label, onSignatureChange }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);
    const [hasSigned, setHasSigned] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Configuración inicial del canvas
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);

        // Limpiar canvas
        clearCanvas();
    }, []);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
        onSignatureChange(label.toLowerCase(), '', false);
    };

    const startDrawing = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e);
        context.beginPath();
        context.moveTo(offsetX, offsetY);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        
        const { offsetX, offsetY } = getCoordinates(e);
        context.lineTo(offsetX, offsetY);
        context.stroke();
        setHasSigned(true);
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            context.closePath();
            if (hasSigned) {
                const signatureData = canvasRef.current.toDataURL();
                onSignatureChange(label.toLowerCase(), signatureData, true);
            }
        }
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        if (e.touches && e.touches[0]) {
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        
        return {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        };
    };

    return (
        <div className="signature-capture">
            <h3>{label}</h3>
            <div className="canvas-container">
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={150}
                    className="signature-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{
                        border: '1px solid #000',
                        backgroundColor: '#fff',
                        touchAction: 'none'
                    }}
                />
            </div>
            <button 
                onClick={clearCanvas}
                className="clear-button"
            >
                Limpiar Firma
            </button>
        </div>
    );
};

export default SignatureCapture;