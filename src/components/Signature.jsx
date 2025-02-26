import React, { useRef, useState, useEffect } from 'react';
import SignaturePad from 'signature_pad';

const Signature = ({ label, onSignatureChange }) => {
    const canvasRef = useRef(null);
    const [signaturePad, setSignaturePad] = useState(null);
    const [signatureData, setSignatureData] = useState(null); // Guardar la firma como URL de datos

    useEffect(() => {
        if (canvasRef.current) {
            const pad = new SignaturePad(canvasRef.current, {
                backgroundColor: 'rgb(255, 255, 255)', // Fondo blanco (opcional)
                penColor: 'rgb(0, 0, 0)', // Color del trazo (negro)
               
            });
            setSignaturePad(pad);

             // Limpiar la firma cuando el componente se desmonte
            return () => {
                pad.off();
            };
        }
    }, []);

    useEffect(() => {
      //Cargar firma
      const savedSignature = localStorage.getItem(`signature_${label}`);
        if(savedSignature){
          setSignatureData(savedSignature)
          if(signaturePad){
            signaturePad.fromDataURL(savedSignature)
          }
        }
    }, [signaturePad, label])


    const handleClear = () => {
        if (signaturePad) {
            signaturePad.clear();
            setSignatureData(null); // Borrar la URL de datos
            localStorage.removeItem(`signature_${label}`)
            onSignatureChange(label, '', false); // Notificar a App.js que no hay firma
        }
    };

    const handleSave = () => {
        if (signaturePad && !signaturePad.isEmpty()) {
            const dataURL = signaturePad.toDataURL(); // Obtener la firma como URL de datos (PNG)
            setSignatureData(dataURL);
             localStorage.setItem(`signature_${label}`, dataURL);
            onSignatureChange(label, dataURL, true); // Notificar a App.js con la URL y "firmado"
        }
    };

    return (
        <div>
            <label>{label}:</label>
            <canvas ref={canvasRef} width={300} height={150} style={{ border: '1px solid black' }} />
            <div>
                <button type="button" onClick={handleClear}>
                    Limpiar
                </button>
                <button type="button" onClick={handleSave}>
                    Guardar
                </button>
            </div>
        </div>
    );
};

export default Signature;













