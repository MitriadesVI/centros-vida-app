# Plan de trabajo: Módulo de Planificación de Visitas

## Contexto del proyecto

Aplicación React.js existente (`centros-vida-app`) desplegada en Netlify con Firebase como backend. El sistema permite a supervisores realizar visitas a espacios de atención del Programa Adulto Mayor, registrar formularios de evaluación y generar reportes PDF.

Se necesita agregar un módulo de **Planificación de Visitas** que permita a los usuarios asignarse tareas de visita diarias/semanales, detectar conflictos entre usuarios, identificar espacios sin visitar y exportar la planificación a Excel.

---

## Stack tecnológico actual

- **Frontend:** React 18 + Material UI 6 + Recharts
- **Backend:** Firebase Firestore + Firebase Auth
- **Almacenamiento local:** Dexie (IndexedDB) para formularios, localStorage para catálogos
- **Exportación:** librería `xlsx` (ya instalada en package.json)
- **Generación PDF:** jsPDF + jspdf-autotable
- **Deploy:** Netlify

---

## Colecciones Firestore existentes relevantes

### `espacios` (catálogo de lugares)
```
{
  id: string (auto),
  nombre: string,           // "Centro de Vida Los Andes"
  tipo: string,             // "cdvfijo" | "cdvparque"
  activo: boolean,
  updatedAt: Timestamp
}
```

### `formSummaries` (visitas realizadas)
```
{
  id: string,
  espacioAtencion: string,  // nombre del espacio visitado
  tipoEspacio: string,      // "cdvfijo" | "cdvparque"
  fechaVisita: string,      // "YYYY-MM-DD"
  userId: string,
  userEmail: string,
  puntajeTotal: number,
  porcentajeCumplimiento: number,
  isComplete: boolean,
  vigencia: number,         // año fiscal (2025, 2026)
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // ... otros campos de evaluación
}
```

### Firebase Auth (usuarios)
```
{
  uid: string,
  email: string
}
```

### Sistema de roles (userRoleService.js)
```javascript
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  APOYO: 'apoyo'
};
```

---

## Colección nueva a crear: `tareasVisita`

### Estructura del documento

```
{
  // --- Campos obligatorios ---
  espacioId: string,          // ID del documento en colección 'espacios'
  espacioNombre: string,      // Nombre desnormalizado para display rápido
  tipoEspacio: string,        // "cdvfijo" | "cdvparque" (copiado del catálogo)
  fechaProgramada: string,    // "YYYY-MM-DD"
  userId: string,             // UID del usuario asignado
  userEmail: string,          // Email del usuario asignado

  // --- Campos de control ---
  estado: string,             // "pendiente" | "completada" | "cancelada"
  vigencia: number,           // Año fiscal derivado de fechaProgramada
  notas: string,              // Texto libre opcional

  // --- Campos de auditoría ---
  createdAt: Timestamp,       // serverTimestamp() al crear
  updatedAt: Timestamp,       // serverTimestamp() al modificar
  creadoPor: string,          // UID de quien creó la tarea (puede diferir de userId)
  formSummaryId: string|null  // Se llena al completar la visita (link a formSummaries)
}
```

### Índices Firestore requeridos

Crear estos índices compuestos en la consola de Firebase (Firestore > Indexes):

1. **Para detección de choques (R1):**
   - Colección: `tareasVisita`
   - Campos: `espacioId` ASC, `fechaProgramada` ASC, `estado` ASC

2. **Para validación semanal (R3):**
   - Colección: `tareasVisita`
   - Campos: `userId` ASC, `espacioId` ASC, `fechaProgramada` ASC

3. **Para listar tareas por semana:**
   - Colección: `tareasVisita`
   - Campos: `fechaProgramada` ASC, `estado` ASC

4. **Para listar tareas de un usuario:**
   - Colección: `tareasVisita`
   - Campos: `userId` ASC, `fechaProgramada` ASC

> **NOTA:** Firebase creará automáticamente algunos de estos índices al ejecutar las queries. Si aparece un error en consola con un link para crear el índice, solo hay que hacer clic en ese link.

---

## Reglas de negocio

### R1 — Detección de choques entre usuarios
- **Cuándo:** Al momento de guardar una nueva tarea.
- **Consulta:** Buscar en `tareasVisita` donde `espacioId == X` AND `fechaProgramada == Y` AND `estado != "cancelada"` AND `userId != usuarioActual`.
- **Comportamiento:** Si encuentra resultados, mostrar alerta amarilla: "⚠️ [email] ya tiene programada una visita a este espacio el [fecha]". **NO bloquea**, el usuario puede continuar si acepta.
- **UX:** Alert de MUI con severity="warning" dentro del formulario de creación.

### R2 — Espacios sin visitar este mes
- **Cuándo:** Se muestra como panel informativo siempre visible en la vista de planificación.
- **Consulta 1:** Obtener todos los documentos de `espacios` donde `activo == true`.
- **Consulta 2:** Obtener todos los documentos de `formSummaries` donde `fechaVisita` >= primer día del mes actual AND `fechaVisita` <= último día del mes actual.
- **Lógica:** Comparar la lista de `espacios.nombre` contra `formSummaries.espacioAtencion`. Los que no aparezcan en ningún formSummary son "sin visitar".
- **Cruce adicional:** También cruzar con `tareasVisita` en estado "pendiente" para este mes, para distinguir entre:
  - 🔴 Sin visitar y sin tarea programada
  - 🟡 Sin visitar pero con tarea programada
  - 🟢 Ya visitado este mes
- **UX:** Resumen tipo chip/badge en la parte superior del panel: "15 de 40 espacios visitados este mes". Lista expandible con los detalles.

### R3 — No duplicar espacio en la misma semana (mismo usuario)
- **Cuándo:** Al momento de guardar una nueva tarea.
- **Consulta:** Buscar en `tareasVisita` donde `userId == usuarioActual` AND `espacioId == X` AND `fechaProgramada` >= lunes de esa semana AND `fechaProgramada` <= domingo de esa semana AND `estado != "cancelada"`.
- **Comportamiento:** Si encuentra resultados, **BLOQUEA** la creación. Mostrar error: "❌ Ya tienes una visita programada a este espacio esta semana ([fecha existente])".
- **UX:** Alert de MUI con severity="error". El botón de guardar se deshabilita.

### Regla de visibilidad
- Todos los usuarios autenticados pueden **VER** todas las tareas de todos los usuarios (para coordinarse).
- Cada usuario solo puede **CREAR, EDITAR y CANCELAR** sus propias tareas.
- No hay restricción por rol para esta funcionalidad (accesible para ADMIN, SUPERVISOR y APOYO).

---

## Archivos a crear/modificar

### ARCHIVO 1: `src/services/tareasService.js` (CREAR NUEVO)

**Propósito:** Toda la lógica de negocio y acceso a Firestore para el módulo de planificación.

**Funciones a implementar:**

```javascript
// ============================================================
// IMPORTS
// ============================================================
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser } from './authService';

// ============================================================
// CONSTANTES
// ============================================================
const TAREAS_COLLECTION = 'tareasVisita';

const ESTADOS = {
  PENDIENTE: 'pendiente',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada'
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Calcula el lunes y domingo de la semana a la que pertenece una fecha.
 * @param {string} fechaStr - Fecha en formato "YYYY-MM-DD"
 * @returns {{ lunes: string, domingo: string }}
 */
const obtenerRangoSemana = (fechaStr) => {
  // Implementar: parsear fecha, calcular lunes (día 1) y domingo (día 7)
  // Retornar ambos en formato "YYYY-MM-DD"
  // IMPORTANTE: usar lógica que funcione con semanas que cruzan meses
};

/**
 * Deriva el año de vigencia a partir de una fecha.
 * @param {string} fechaStr - Fecha en formato "YYYY-MM-DD"
 * @returns {number}
 */
const deriveVigencia = (fechaStr) => {
  // Reutilizar patrón existente de formDataService.js
};

// ============================================================
// FUNCIÓN: Crear tarea
// ============================================================

/**
 * Crea una nueva tarea de visita.
 * ANTES de llamar esta función, se deben ejecutar las validaciones R1 y R3.
 * 
 * @param {Object} datosTarea
 * @param {string} datosTarea.espacioId - ID del espacio en colección 'espacios'
 * @param {string} datosTarea.espacioNombre - Nombre del espacio
 * @param {string} datosTarea.tipoEspacio - "cdvfijo" | "cdvparque"
 * @param {string} datosTarea.fechaProgramada - "YYYY-MM-DD"
 * @param {string} [datosTarea.notas] - Notas opcionales
 * @returns {Promise<string>} ID del documento creado
 */
export const crearTarea = async (datosTarea) => {
  // 1. Obtener usuario actual (getCurrentUser)
  // 2. Construir documento con todos los campos de la estructura
  // 3. Estado inicial: "pendiente"
  // 4. Vigencia: derivar del año de fechaProgramada
  // 5. Guardar en Firestore con addDoc
  // 6. Retornar el ID del documento creado
};

// ============================================================
// FUNCIÓN: Validar R3 - No duplicar espacio en la semana
// ============================================================

/**
 * Verifica si el usuario ya tiene una tarea para el mismo espacio en la misma semana.
 * 
 * @param {string} espacioId
 * @param {string} fechaProgramada - "YYYY-MM-DD"
 * @returns {Promise<{bloqueado: boolean, tareaExistente: Object|null}>}
 */
export const validarDuplicadoSemanal = async (espacioId, fechaProgramada) => {
  // 1. Obtener userId actual
  // 2. Calcular rango de la semana (lunes a domingo) usando obtenerRangoSemana()
  // 3. Query: tareasVisita donde userId == actual AND espacioId == X
  //    AND fechaProgramada >= lunes AND fechaProgramada <= domingo
  //    AND estado != "cancelada"
  // 4. Retornar { bloqueado: true/false, tareaExistente: datos o null }
};

// ============================================================
// FUNCIÓN: Validar R1 - Detectar choques con otros usuarios
// ============================================================

/**
 * Verifica si otro usuario ya tiene una tarea para el mismo espacio en la misma fecha.
 * 
 * @param {string} espacioId
 * @param {string} fechaProgramada - "YYYY-MM-DD"
 * @returns {Promise<{hayChoque: boolean, tareasConflicto: Array}>}
 */
export const detectarChoque = async (espacioId, fechaProgramada) => {
  // 1. Obtener userId actual
  // 2. Query: tareasVisita donde espacioId == X AND fechaProgramada == Y
  //    AND estado != "cancelada" AND userId != actual
  //    NOTA: Firestore no soporta != en dos campos distintos.
  //    Solución: consultar sin filtro de userId, luego filtrar en JS.
  // 3. Filtrar en JavaScript: excluir las tareas del usuario actual
  // 4. Retornar { hayChoque: true/false, tareasConflicto: [array de tareas] }
};

// ============================================================
// FUNCIÓN: Obtener tareas por rango de fechas (vista semanal)
// ============================================================

/**
 * Obtiene TODAS las tareas (de todos los usuarios) para un rango de fechas.
 * Se usa para la vista semanal.
 * 
 * @param {string} fechaInicio - "YYYY-MM-DD"
 * @param {string} fechaFin - "YYYY-MM-DD"
 * @returns {Promise<Array>}
 */
export const obtenerTareasPorRango = async (fechaInicio, fechaFin) => {
  // 1. Query: tareasVisita donde fechaProgramada >= fechaInicio
  //    AND fechaProgramada <= fechaFin
  //    ordenado por fechaProgramada ASC
  // 2. Mapear resultados incluyendo el ID del documento
  // 3. Retornar array de tareas
};

// ============================================================
// FUNCIÓN: Obtener espacios sin visitar este mes (R2)
// ============================================================

/**
 * Cruza catálogo de espacios con visitas realizadas y tareas programadas
 * para el mes actual.
 * 
 * @returns {Promise<{
 *   totalEspacios: number,
 *   visitados: Array,
 *   conTareaPendiente: Array,
 *   sinVisitarSinTarea: Array
 * }>}
 */
export const obtenerEspaciosSinVisitar = async () => {
  // 1. Calcular primer día y último día del mes actual
  // 2. Query 1: obtener todos los espacios activos de colección 'espacios'
  // 3. Query 2: obtener formSummaries del mes actual (fechaVisita >= primerDia AND <= ultimoDia)
  // 4. Query 3: obtener tareasVisita pendientes del mes actual
  // 5. Cruzar:
  //    - Set de espacios visitados: espacioAtencion de formSummaries
  //    - Set de espacios con tarea pendiente: espacioNombre de tareasVisita pendientes
  //    - Sin visitar sin tarea: espacios activos que no están en ninguno de los dos sets
  // 6. Retornar las tres listas categorizadas
  //
  // NOTA IMPORTANTE: el campo espacioAtencion de formSummaries es el nombre del espacio
  // (string), no un ID. La comparación se hace por nombre. Esto funciona porque el 
  // catálogo estandarizado ahora garantiza nombres consistentes.
};

// ============================================================
// FUNCIÓN: Cancelar tarea
// ============================================================

/**
 * Cambia el estado de una tarea a "cancelada".
 * Solo el usuario dueño de la tarea puede cancelarla.
 * 
 * @param {string} tareaId - ID del documento en tareasVisita
 * @returns {Promise<void>}
 */
export const cancelarTarea = async (tareaId) => {
  // 1. Obtener la tarea
  // 2. Verificar que el userId coincide con el usuario actual
  // 3. Actualizar estado a "cancelada" + updatedAt
};

// ============================================================
// FUNCIÓN: Completar tarea (vinculando con formSummary)
// ============================================================

/**
 * Cambia el estado de una tarea a "completada" y la vincula con un formSummary.
 * Se llama automáticamente al finalizar un formulario (generatePdf).
 * 
 * @param {string} tareaId - ID del documento en tareasVisita
 * @param {string} formSummaryId - ID del formSummary generado
 * @returns {Promise<void>}
 */
export const completarTarea = async (tareaId, formSummaryId) => {
  // 1. Actualizar: estado = "completada", formSummaryId, updatedAt
};

// ============================================================
// FUNCIÓN: Buscar tarea pendiente que coincida con una visita
// ============================================================

/**
 * Busca si existe una tarea pendiente que coincida con los datos de una visita
 * recién finalizada. Se usa para el cierre automático.
 * 
 * @param {string} espacioNombre - Nombre del espacio de la visita
 * @param {string} fechaVisita - "YYYY-MM-DD"
 * @param {string} userId - UID del usuario
 * @returns {Promise<string|null>} ID de la tarea encontrada o null
 */
export const buscarTareaPendienteParaVisita = async (espacioNombre, fechaVisita, userId) => {
  // 1. Query: tareasVisita donde espacioNombre == X AND fechaProgramada == Y
  //    AND userId == Z AND estado == "pendiente"
  // 2. Si hay resultado, retornar el ID
  // 3. Si no, retornar null
};

// ============================================================
// FUNCIÓN: Editar notas de una tarea
// ============================================================

/**
 * Actualiza las notas de una tarea existente.
 * Solo el dueño puede editar.
 * 
 * @param {string} tareaId
 * @param {string} notas
 * @returns {Promise<void>}
 */
export const editarNotasTarea = async (tareaId, notas) => {
  // 1. Verificar propiedad
  // 2. Actualizar notas + updatedAt
};

// ============================================================
// EXPORTS
// ============================================================
export { ESTADOS };
export default {
  crearTarea,
  validarDuplicadoSemanal,
  detectarChoque,
  obtenerTareasPorRango,
  obtenerEspaciosSinVisitar,
  cancelarTarea,
  completarTarea,
  buscarTareaPendienteParaVisita,
  editarNotasTarea,
  ESTADOS
};
```

**Notas de implementación importantes:**
- Firestore NO soporta `!=` en campos combinados con otros filtros complejos. Donde se necesite filtrar por `estado != "cancelada"`, hacer la query sin ese filtro y filtrar en JavaScript después.
- Las fechas se almacenan como strings "YYYY-MM-DD" (igual que en formSummaries) para poder hacer comparaciones lexicográficas directas con `>=` y `<=`.
- Usar `serverTimestamp()` para `createdAt` y `updatedAt`.

---

### ARCHIVO 2: `src/components/planificacion/PlanificacionPanel.jsx` (CREAR NUEVO)

**Propósito:** Interfaz principal del módulo de planificación.

**Estructura del componente:**

```
PlanificacionPanel
├── Barra de navegación semanal (← Semana anterior | Semana del 17-23 Mar 2026 | Semana siguiente →)
├── Panel R2: Resumen de espacios sin visitar (colapsable)
│   ├── Chip resumen: "15/40 espacios visitados"
│   └── Lista categorizada (expandible):
│       ├── 🔴 Sin visitar, sin tarea
│       ├── 🟡 Sin visitar, con tarea pendiente
│       └── 🟢 Ya visitados
├── Botón "Nueva Tarea" → abre diálogo
├── Vista semanal: Tabla/Grid
│   ├── Columnas: Lunes | Martes | Miércoles | Jueves | Viernes | Sábado | Domingo
│   ├── Filas: Cards de tareas agrupadas por día
│   │   ├── Nombre del espacio
│   │   ├── Email del usuario asignado
│   │   ├── Chip de estado (pendiente/completada/cancelada)
│   │   └── Botón cancelar (solo si es tu tarea y está pendiente)
│   └── Las tareas del usuario actual resaltadas con borde de color
├── Botón "Exportar Excel"
└── Diálogo "Nueva Tarea"
    ├── Autocomplete de espacio (desde colección 'espacios' activos)
    ├── DatePicker para fecha
    ├── Campo de notas (opcional)
    ├── Zona de alertas:
    │   ├── R3: Error rojo si ya tiene ese espacio esta semana (bloquea guardar)
    │   └── R1: Warning amarillo si otro usuario tiene ese espacio ese día
    └── Botón Guardar (deshabilitado si R3 bloquea)
```

**Dependencias de MUI a usar:**
- `Autocomplete` para búsqueda de espacios con autocompletado
- `TextField` con `type="date"` para selección de fecha
- `Table` / `Grid` para vista semanal
- `Dialog` para formulario de nueva tarea
- `Chip` para estados
- `Alert` para R1 y R3
- `Accordion` / `Collapse` para panel R2
- `IconButton` con iconos de navegación semanal

**Props del componente:**
```jsx
<PlanificacionPanel user={user} />
```
- `user`: objeto con `uid` y `email` del usuario autenticado.

**Estados principales del componente:**
```javascript
const [semanaActual, setSemanaActual] = useState(obtenerSemanaActual());
const [tareas, setTareas] = useState([]);
const [espaciosSinVisitar, setEspaciosSinVisitar] = useState(null);
const [espaciosCatalogo, setEspaciosCatalogo] = useState([]);
const [loading, setLoading] = useState(true);
const [dialogOpen, setDialogOpen] = useState(false);
const [alertaR1, setAlertaR1] = useState(null);
const [alertaR3, setAlertaR3] = useState(null);
const [formValues, setFormValues] = useState({
  espacio: null,       // objeto del Autocomplete
  fecha: '',           // "YYYY-MM-DD"
  notas: ''
});
```

**Flujo de validación al seleccionar espacio + fecha (ambos campos llenos):**
```
1. Usuario selecciona espacio en Autocomplete
2. Usuario selecciona fecha
3. Si ambos tienen valor → ejecutar en paralelo:
   a. validarDuplicadoSemanal(espacioId, fecha) → si bloqueado, setAlertaR3
   b. detectarChoque(espacioId, fecha) → si hay choque, setAlertaR1
4. El botón "Guardar" se deshabilita si alertaR3.bloqueado === true
5. Si el usuario cambia espacio o fecha, limpiar alertas y re-validar
```

**Exportación Excel:**
- Usar la librería `xlsx` (ya instalada en package.json)
- Exportar las tareas visibles de la semana actual
- Columnas: Fecha | Espacio | Tipo | Usuario | Estado | Notas
- Nombre del archivo: `Planificacion_Semana_YYYY-MM-DD.xlsx`

**Importación necesaria para xlsx:**
```javascript
import * as XLSX from 'xlsx';
```

---

### ARCHIVO 3: Modificar `src/App.js`

**Cambios requeridos (3 puntos de inserción):**

#### 3.1 — Agregar import (línea ~16, junto a los otros imports de componentes)
```javascript
import PlanificacionPanel from './components/planificacion/PlanificacionPanel';
```

#### 3.2 — Agregar Tab (línea ~778, después del Tab de Catálogos)
```jsx
{/* Tab de Planificación - visible para TODOS los roles */}
<Tab label="Planificación" value="planificacion" />
```
**NOTA:** Este tab NO tiene restricción de rol. Todos los usuarios lo ven.

#### 3.3 — Agregar renderizado condicional (línea ~948, después del bloque de CatalogosPanel)
```jsx
) : viewMode === 'planificacion' ? (
    <PlanificacionPanel user={user} />
```

#### 3.4 — (OPCIONAL / FASE 2) Cierre automático en generatePdf
Dentro de la función `generatePdf` en App.js, después de la línea que llama a `saveFormSummary(summaryData)`, agregar:
```javascript
// Cierre automático de tarea pendiente
try {
  const { buscarTareaPendienteParaVisita, completarTarea } = await import('./services/tareasService');
  const tareaId = await buscarTareaPendienteParaVisita(
    headerData.espacioAtencion,
    headerData.fechaVisita,
    user.uid
  );
  if (tareaId) {
    await completarTarea(tareaId, remoteFormId || currentFormId);
    console.log('Tarea cerrada automáticamente:', tareaId);
  }
} catch (err) {
  console.warn('No se pudo cerrar tarea automáticamente:', err);
  // No interrumpir el flujo del PDF por esto
}
```

---

### ARCHIVO 4: Crear carpeta

```bash
mkdir -p src/components/planificacion
```

---

## Orden de ejecución recomendado

### Fase 1: Servicio de datos (tareasService.js)
1. Crear el archivo `src/services/tareasService.js`
2. Implementar las funciones auxiliares (`obtenerRangoSemana`, `deriveVigencia`)
3. Implementar `crearTarea`
4. Implementar `validarDuplicadoSemanal` (R3)
5. Implementar `detectarChoque` (R1)
6. Implementar `obtenerTareasPorRango`
7. Implementar `obtenerEspaciosSinVisitar` (R2)
8. Implementar `cancelarTarea`
9. Implementar `completarTarea` y `buscarTareaPendienteParaVisita`
10. Implementar `editarNotasTarea`

### Fase 2: Interfaz de usuario (PlanificacionPanel.jsx)
11. Crear carpeta `src/components/planificacion/`
12. Crear componente base con estados y estructura
13. Implementar navegación semanal (anterior/siguiente)
14. Implementar carga de tareas por semana
15. Implementar vista semanal (tabla/grid con cards)
16. Implementar panel R2 (espacios sin visitar)
17. Implementar diálogo "Nueva Tarea" con Autocomplete
18. Implementar validaciones R1 y R3 en el diálogo
19. Implementar cancelación de tareas
20. Implementar exportación Excel

### Fase 3: Integración con App.js
21. Agregar import de PlanificacionPanel en App.js
22. Agregar Tab "Planificación" en la barra de navegación
23. Agregar renderizado condicional del panel
24. (Opcional) Agregar cierre automático en generatePdf

### Fase 4: Firebase
25. Ejecutar las queries por primera vez (Firebase sugerirá crear índices)
26. Crear los índices compuestos que Firebase solicite
27. (Opcional) Configurar reglas de seguridad de Firestore para `tareasVisita`

---

## Reglas de seguridad sugeridas para Firestore

```javascript
// En Firebase Console > Firestore > Rules
// Agregar regla para la nueva colección:

match /tareasVisita/{tareaId} {
  // Cualquier usuario autenticado puede leer todas las tareas
  allow read: if request.auth != null;
  
  // Solo puede crear si está autenticado y el userId coincide
  allow create: if request.auth != null 
    && request.resource.data.userId == request.auth.uid;
  
  // Solo puede actualizar si es el dueño de la tarea
  allow update: if request.auth != null 
    && resource.data.userId == request.auth.uid;
  
  // Solo admins pueden eliminar (o nadie, usar cancelar en su lugar)
  allow delete: if false;
}
```

---

## Consideraciones técnicas

### Limitaciones de Firestore a tener en cuenta
- **No soporta `!=` combinado con otros filtros de rango.** Las queries que necesiten filtrar `estado != "cancelada"` junto con filtros de rango (`fechaProgramada >= X`) deben hacer la query sin el `!=` y filtrar en JavaScript.
- **Máximo 10 cláusulas `in`/`array-contains-any`.** No es problema aquí porque no las usamos.
- **Las queries compuestas necesitan índices.** Firebase lanzará un error en consola con un link directo para crear el índice. Solo hacer clic en el link.

### Rendimiento esperado
- El catálogo de espacios tiene ~40-100 documentos. Carga completa es viable.
- Las tareas por semana serán ~20-50 documentos. No hay problema de rendimiento.
- Los formSummaries del mes serán ~50-200 documentos. Manejable.

### Offline
- El módulo de planificación requiere conexión a internet (Firestore online) para la primera versión.
- Mejora futura: usar persistencia de Firestore (`enableIndexedDbPersistence`) para cachear datos.

---

## Criterios de aceptación

1. ✅ El usuario puede crear una tarea seleccionando un espacio del catálogo (autocompletado) y una fecha.
2. ✅ Si el usuario ya tiene ese espacio programado en la misma semana, el sistema bloquea la creación (R3).
3. ✅ Si otro usuario tiene el mismo espacio en la misma fecha, el sistema muestra una alerta pero permite continuar (R1).
4. ✅ El panel muestra un resumen de espacios visitados/pendientes del mes (R2).
5. ✅ La vista semanal muestra las tareas de TODOS los usuarios.
6. ✅ Cada usuario solo puede cancelar sus propias tareas.
7. ✅ Las tareas se pueden exportar a Excel.
8. ✅ El tab "Planificación" es visible para todos los roles.
9. ✅ La navegación entre semanas funciona correctamente.
10. ✅ Las tareas completadas y canceladas se muestran con un estilo visual diferenciado.
