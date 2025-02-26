import React, { useState, useRef, useEffect } from 'react';
import SignatureField from './SignatureField';
import '../styles/forms.css';
import './SignatureCapture.css';

const SignatureCapture = ({ label, onSignatureChange, initialData = { data: '', checked: false } }) => {
    const [signature, setSignature] = useState(initialData.data || '');
    const [checked, setChecked] = useState(initialData.checked || false);
    const signatureRef = useRef(null);

    useEffect(() => {
        // Notificar al componente padre cuando la firma cambie
        onSignatureChange(label, signature, checked);
    }, [signature, checked, label, onSignatureChange]);

    const handleSignatureChange = (signatureData) => {
        setSignature(signatureData);
    };

    const handleCheckChange = (e) => {
        const isChecked = e.target.checked;
        setChecked(isChecked);
        
        // Si se marca "No firmado", borrar la firma
        if (isChecked && signatureRef.current) {
            signatureRef.current.clear();
        }
    };

    const clearSignature = () => {
        if (signatureRef.current) {
            signatureRef.current.clear();
        }
    };

    return (
        <div className="form-container">
            <div className="form-section">
                <h3 className="section-title">Firma: {label}</h3>
                <div className="signature-container">
                    <SignatureField 
                        ref={signatureRef}
                        onChange={handleSignatureChange}
                        initialData={signature}
                    />
                    <div className="signature-actions">
                        <button 
                            type="button" 
                            className="clear-button"
                            onClick={clearSignature}
                            disabled={checked}
                        >
                            Limpiar Firma
                        </button>
                        <div className="checkbox-container">
                            <input
                                type="checkbox"
                                id={`no-signature-${label.replace(/\s+/g, '-')}`}
                                checked={checked}
                                onChange={handleCheckChange}
                            />
                            <label htmlFor={`no-signature-${label.replace(/\s+/g, '-')}`}>
                                No firmado
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignatureCapture;