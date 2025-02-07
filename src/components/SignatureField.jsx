import React from 'react';

const SignatureField = ({label, signature}) => {
  return (
    <div>
      {signature.checked && signature.data ? (
        <img src={signature.data} alt={`Firma ${label}`} style={{ width: '100px', height: 'auto', border: '1px solid black' }} />
      ) : (
        <p>{label}: No Firmado</p>
      )}
      <p>Firma {label}</p>
    </div>
  )
}

export default SignatureField;