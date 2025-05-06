import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { register } from '../services/authService';

const AdminRegister = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('Por favor complete todos los campos');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const user = await register(email, password);
      setSuccess(`Usuario ${user.email} registrado correctamente`);
      
      // Limpiar el formulario
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error en registro:', error);
      
      // Manejar tipos de error comunes
      if (error.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado');
      } else if (error.code === 'auth/invalid-email') {
        setError('Correo electrónico inválido');
      } else if (error.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil');
      } else {
        setError('Error al registrar usuario. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Registrar Nuevo Administrador
        </Typography>
        
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Cree cuentas para los administradores del sistema
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <form onSubmit={handleRegister}>
          <TextField
            label="Correo electrónico"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          
          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          
          <TextField
            label="Confirmar contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Registrar Usuario'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default AdminRegister;