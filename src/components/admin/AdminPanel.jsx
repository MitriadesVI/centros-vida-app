import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ROLES, changeUserRole, getUserRole } from '../../services/userRoleService';
import { register } from '../../services/authService';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SecurityIcon from '@mui/icons-material/Security';

const AdminPanel = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  
  // Estados para registro de nuevo usuario
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState(ROLES.APOYO);
  const [registerLoading, setRegisterLoading] = useState(false);
  
  // Estados para confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cargar usuarios al iniciar
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Obtener todos los usuarios desde Firestore
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        const usersData = [];
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          
          // Solo si hay un ID de usuario, intentar obtener su info
          if (userDoc.id) {
            try {
              // Obtener el rol del usuario
              const role = await getUserRole(userDoc.id);
              
              // Si el usuario tiene un rol (es un usuario autorizado)
              if (role !== null) {
                usersData.push({
                  id: userDoc.id,
                  email: userData.email || 'No disponible',
                  role: role,
                  lastLogin: userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Nunca',
                  created: userData.created ? new Date(userData.created).toLocaleString() : 'Desconocido',
                  createdBy: userData.createdBy || 'Desconocido',
                  status: userData.status || 'active'
                });
              }
            } catch (err) {
              console.error('Error al obtener detalles del usuario:', err);
            }
          }
        }
        
        // Ordenar por rol y luego por email
        usersData.sort((a, b) => {
          if (a.role !== b.role) {
            if (a.role === ROLES.ADMIN) return -1;
            if (b.role === ROLES.ADMIN) return 1;
            if (a.role === ROLES.SUPERVISOR) return -1;
            if (b.role === ROLES.SUPERVISOR) return 1;
          }
          return a.email.localeCompare(b.email);
        });
        
        setUsers(usersData);
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
        setError('Error al cargar la lista de usuarios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Funciones para gestionar el diálogo de cambio de rol
  const handleOpenDialog = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
  };

  const handleChangeRole = async () => {
    try {
      await changeUserRole(selectedUser.id, newRole);
      
      // Actualizar el estado local
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));
      
      setSuccess(`Rol actualizado correctamente para ${selectedUser.email}`);
      handleCloseDialog();
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al cambiar el rol:', error);
      setError('No se pudo cambiar el rol del usuario');
    }
  };
  
  // Funciones para gestionar el diálogo de registro de nuevo usuario
  const handleOpenRegisterDialog = () => {
    setRegisterDialogOpen(true);
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole(ROLES.APOYO);
    setError(null);
  };
  
  const handleCloseRegisterDialog = () => {
    setRegisterDialogOpen(false);
  };
  
  const handleRegisterUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      setError('Por favor ingrese correo y contraseña');
      return;
    }
    
    if (newUserPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setRegisterLoading(true);
    setError(null);
    
    try {
      // Registrar usuario en Authentication
      const userCredential = await register(newUserEmail, newUserPassword);
      
      // Crear documento en Firestore con rol y datos adicionales
      const userRef = doc(db, 'users', userCredential.uid);
      await setDoc(userRef, { 
        email: newUserEmail,
        role: newUserRole,
        created: new Date().toISOString(),
        createdBy: user.uid, // ID del administrador que lo creó
        status: 'active'
      });
      
      // Añadir el nuevo usuario a la lista
      setUsers([...users, {
        id: userCredential.uid,
        email: newUserEmail,
        role: newUserRole,
        lastLogin: 'Nunca',
        created: new Date().toLocaleString(),
        createdBy: user.uid,
        status: 'active'
      }]);
      
      setSuccess(`Usuario ${newUserEmail} registrado exitosamente con rol ${newUserRole}`);
      handleCloseRegisterDialog();
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya está en uso');
      } else if (error.code === 'auth/invalid-email') {
        setError('Correo electrónico inválido');
      } else if (error.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil');
      } else {
        setError('Error al registrar usuario. Intente nuevamente.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };
  
  // Funciones para gestionar eliminación de usuario
  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleteLoading(true);
    
    try {
      // Marcar como desactivado en Firestore (no eliminamos realmente)
      const userRef = doc(db, 'users', userToDelete.id);
      await updateDoc(userRef, { 
        status: 'inactive',
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: user.uid
      });
      
      // Actualizar estado local
      setUsers(users.filter(u => u.id !== userToDelete.id));
      
      setSuccess(`Usuario ${userToDelete.email} desactivado exitosamente`);
      handleCloseDeleteDialog();
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      setError('Error al desactivar el usuario. Intente nuevamente.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Mostrar cargando
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
        Panel de Administración
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Gestión de Usuarios
              </Typography>
              
              <Button 
                variant="contained" 
                startIcon={<PersonAddIcon />}
                onClick={handleOpenRegisterDialog}
              >
                Registrar Nuevo Usuario
              </Button>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rol</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Último Acceso</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Creado</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((userData) => (
                    <TableRow key={userData.id} hover>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>
                        <Box sx={{ 
                          bgcolor: 
                            userData.role === ROLES.ADMIN ? '#e8f5e9' : 
                            userData.role === ROLES.SUPERVISOR ? '#e3f2fd' : '#f5f5f5',
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          display: 'inline-block'
                        }}>
                          {userData.role}
                        </Box>
                      </TableCell>
                      <TableCell>{userData.lastLogin}</TableCell>
                      <TableCell>{userData.created}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Cambiar rol">
                            <IconButton 
                              color="primary"
                              onClick={() => handleOpenDialog(userData)}
                              disabled={user?.uid === userData.id} // No permitir cambiar el propio rol
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Desactivar usuario">
                            <IconButton 
                              color="error"
                              onClick={() => handleOpenDeleteDialog(userData)}
                              disabled={
                                user?.uid === userData.id || // No permitir eliminarse a sí mismo
                                userData.role === ROLES.ADMIN // No permitir eliminar otros admins
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {users.length === 0 && (
              <Typography variant="body1" sx={{ my: 2, textAlign: 'center' }}>
                No se encontraron usuarios
              </Typography>
            )}
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
              Total de usuarios: {users.length} ({users.filter(u => u.role === ROLES.ADMIN).length} administradores, 
              {users.filter(u => u.role === ROLES.SUPERVISOR).length} supervisores, 
              {users.filter(u => u.role === ROLES.APOYO).length} apoyo)
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Guía de roles
            </Typography>
            <Typography variant="body2" paragraph>
              Los usuarios con diferentes roles tienen distintos niveles de acceso en la aplicación:
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                  <Typography variant="subtitle1" fontWeight="bold">Administrador</Typography>
                  <Typography variant="body2">
                    Acceso completo a formularios, dashboard y panel de administración. Puede crear y gestionar usuarios.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                  <Typography variant="subtitle1" fontWeight="bold">Supervisor</Typography>
                  <Typography variant="body2">
                    Acceso a formularios y dashboard. Puede ver todas las métricas y supervisar el desempeño.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="subtitle1" fontWeight="bold">Apoyo</Typography>
                  <Typography variant="body2">
                    Acceso solamente a formularios. Puede llenar y guardar formularios pero no puede ver las estadísticas.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Diálogo para cambiar rol */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cambiar el rol del usuario: <strong>{selectedUser?.email}</strong>
          </DialogContentText>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="role-select-label">Rol</InputLabel>
            <Select
              labelId="role-select-label"
              value={newRole}
              label="Rol"
              onChange={(e) => setNewRole(e.target.value)}
            >
              <MenuItem value={ROLES.ADMIN}>Administrador</MenuItem>
              <MenuItem value={ROLES.SUPERVISOR}>Supervisor</MenuItem>
              <MenuItem value={ROLES.APOYO}>Apoyo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleChangeRole} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para registrar nuevo usuario */}
      <Dialog open={registerDialogOpen} onClose={handleCloseRegisterDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}
          
          <DialogContentText sx={{ mb: 2 }}>
            Ingrese los datos del nuevo usuario
          </DialogContentText>
          
          <TextField
            autoFocus
            margin="dense"
            label="Correo Electrónico"
            type="email"
            fullWidth
            variant="outlined"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            sx={{ mb: 2, mt: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Contraseña"
            type="password"
            fullWidth
            variant="outlined"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            sx={{ mb: 2 }}
            helperText="La contraseña debe tener al menos 6 caracteres"
          />
          
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="new-user-role-label">Rol</InputLabel>
            <Select
              labelId="new-user-role-label"
              value={newUserRole}
              label="Rol"
              onChange={(e) => setNewUserRole(e.target.value)}
            >
              <MenuItem value={ROLES.ADMIN}>Administrador</MenuItem>
              <MenuItem value={ROLES.SUPERVISOR}>Supervisor</MenuItem>
              <MenuItem value={ROLES.APOYO}>Apoyo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRegisterDialog}>Cancelar</Button>
          <Button 
            onClick={handleRegisterUser} 
            variant="contained"
            disabled={registerLoading}
          >
            {registerLoading ? <CircularProgress size={24} /> : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para confirmar eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirmar desactivación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea desactivar al usuario <strong>{userToDelete?.email}</strong>?
            <br /><br />
            Este usuario ya no podrá acceder a la aplicación.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button 
            onClick={handleDeleteUser} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;