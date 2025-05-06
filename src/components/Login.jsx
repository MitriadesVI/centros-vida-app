import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { login } from '../services/authService';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor ingrese su correo y contraseña');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const user = await login(email, password);
      onLoginSuccess(user);
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      
      // Manejar tipos de error comunes
      if (error.code === 'auth/invalid-email') {
        setError('Correo electrónico inválido');
      } else if (error.code === 'auth/user-disabled') {
        setError('Esta cuenta ha sido deshabilitada');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos');
      } else {
        setError('Error al iniciar sesión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Iniciar Sesión
        </Typography>
        
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Inicie sesión para guardar y sincronizar sus formularios
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleLogin}>
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
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
          </Button>
        </form>
        
        <Typography variant="body2" color="textSecondary" align="center">
          También puede usar la aplicación sin iniciar sesión,
          pero los formularios solo se guardarán localmente.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;