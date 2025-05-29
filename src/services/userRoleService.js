import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Roles disponibles en el sistema
export const ROLES = {
  ADMIN: 'admin',           // Acceso completo (formularios, dashboard, admin)
  SUPERVISOR: 'supervisor', // Acceso a formularios y dashboard
  APOYO: 'apoyo'            // Solo acceso a formularios
};

// Obtener el rol del usuario con logs detallados para diagnóstico
export const getUserRole = async (userId) => {
  console.log("getUserRole llamado con userId:", userId);
  
  try {
    // Comprobación especial para tu usuario - Para diagnosticar el problema
    if (userId === "NZxhIO32YfOGmk3eOcwOYb8KrR83") {
      console.log("ID de usuario reconocido como administrador principal");
    }
    
    const userRef = doc(db, 'users', userId);
    console.log("Buscando documento con ID:", userId);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      console.log("Documento encontrado:", docSnap.data());
      
      // CORRECCIÓN IMPORTANTE: Recuperar el campo role de varias formas posibles
      const userData = docSnap.data();
      let role = null;
      
      // Intentar diferentes formas de acceder al campo role
      if (userData.role) {
        role = userData.role;
      } else if (userData["role"]) {
        role = userData["role"];
      } else if (userData[" role "]) {
        role = userData[" role "];
      } else if (userData["role:"]) {
        role = userData["role:"];
      }
      
      // SOLUCIÓN TEMPORAL: Si no se encuentra el rol pero es el admin, asignar admin
      if (!role && userId === "NZxhIO32YfOGmk3eOcwOYb8KrR83") {
        console.log("SOLUCIÓN TEMPORAL: Asignando rol admin al usuario principal");
        
        // Intentar corregir el documento
        try {
          await updateDoc(userRef, {
            role: "admin"  // Establecer el campo correctamente
          });
          console.log("Documento corregido con campo role");
        } catch (updateError) {
          console.error("No se pudo corregir el documento:", updateError);
        }
        
        return "admin";
      }
      
      console.log("Rol obtenido:", role);
      
      if (role) {
        return role;
      } else {
        console.log("ADVERTENCIA: El documento existe pero no tiene campo 'role'");
        
        // Si el correo es ortizrodrigo39@gmail.com, otorgar acceso admin temporal
        if (userData.email === "ortizrodrigo39@gmail.com") {
          console.log("Otorgando acceso admin temporal a ortizrodrigo39@gmail.com");
          return "admin";
        }
        
        return null;
      }
    } else {
      console.log(`Usuario ${userId} no encontrado en Firestore`);
      
      // Comprobación especial solo para tu usuario mientras diagnosticamos
      if (userId === "NZxhIO32YfOGmk3eOcwOYb8KrR83") {
        console.log("SOLUCIÓN TEMPORAL: Asignando rol admin al usuario principal");
        return "admin";
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error al obtener el rol del usuario:', error);
    
    // En caso de error, usar solución temporal para admin principal
    if (userId === "NZxhIO32YfOGmk3eOcwOYb8KrR83") {
      console.log("SOLUCIÓN TEMPORAL (error): Asignando rol admin al usuario principal");
      return "admin";
    }
    
    return null;
  }
};

// Verificar si un usuario está autorizado
export const isUserAuthorized = async (userId) => {
  console.log("isUserAuthorized llamado con userId:", userId);
  const role = await getUserRole(userId);
  console.log("Rol obtenido en isUserAuthorized:", role);
  return role !== null;
};

// Cambiar el rol de un usuario (solo para administradores)
export const changeUserRole = async (targetUserId, newRole) => {
  console.log("Cambiando rol para usuario:", targetUserId, "Nuevo rol:", newRole);
  try {
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, { 
      role: newRole,  // Asegurarse de que no haya espacios en el nombre del campo
      updatedAt: new Date().toISOString()
    });
    console.log("Rol actualizado correctamente");
    return true;
  } catch (error) {
    console.error('Error al cambiar el rol del usuario:', error);
    throw error;
  }
};

// Registrar el último inicio de sesión
export const updateLastLogin = async (userId) => {
  console.log("Actualizando último login para usuario:", userId);
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      // Solo actualizar la fecha de último login, NO el rol
      await updateDoc(userRef, { 
        lastLogin: new Date().toISOString()
        // ¡NO actualizar el rol aquí!
      });
      console.log("Último login actualizado correctamente");
    } else {
      console.log("Documento no encontrado, creando uno nuevo");
      // Si es un nuevo usuario sin documento, ahora le asignamos rol APOYO por defecto
      await setDoc(userRef, { 
        role: ROLES.APOYO, // Usar APOYO como rol predeterminado para nuevos usuarios
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        status: "active"
      });
      console.log("Documento de usuario creado con rol predeterminado APOYO");
    }
  } catch (error) {
    console.error('Error al actualizar último login:', error);
  }
};
// Asignar un rol a un usuario nuevo
export const assignRoleToNewUser = async (userId, email, role = ROLES.APOYO) => {
  console.log("Asignando rol a nuevo usuario:", userId, email, role);
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      role: role,  // Asegurar que no haya espacios en el nombre del campo
      email: email,
      created: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: "active"
    });
    console.log("Rol asignado correctamente");
    return true;
  } catch (error) {
    console.error('Error al asignar rol a nuevo usuario:', error);
    return false;
  }
};

export default {
  ROLES,
  getUserRole,
  isUserAuthorized,
  changeUserRole,
  updateLastLogin,
  assignRoleToNewUser
};