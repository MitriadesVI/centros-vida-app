import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword 
  } from 'firebase/auth';
  import { auth } from '../firebase/config';
  
  // Iniciar sesión
  export const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    }
  };
  
  // Registrar un nuevo usuario (para crear administradores)
  export const register = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error en registro:", error);
      throw error;
    }
  };
  
  // Cerrar sesión
  export const logout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("Error en logout:", error);
      throw error;
    }
  };
  
  // Observar cambios en el estado de autenticación
  export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
  };
  
  // Obtener usuario actual
  export const getCurrentUser = () => {
    return auth.currentUser;
  };
  
  export default {
    login,
    register,
    logout,
    onAuthChange,
    getCurrentUser
  };