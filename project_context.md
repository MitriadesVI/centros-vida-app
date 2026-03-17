# Project Context

## Objective
Web app to manage field supervision forms, save drafts locally, generate final PDF reports, and sync visit summaries to Firebase for dashboard and history.

## Stack
- React
- Material UI
- Dexie + IndexedDB
- Firebase Auth
- Firestore
- jsPDF / autoTable

## Roles
- `admin`: dashboard, admin, catalogos, forms
- `supervisor`: dashboard, catalogos, forms
- `apoyo`: forms, saved forms

> Important: Firestore `role` values must be lowercase.

## Main Flow
1. User fills supervision form.
2. Draft is saved locally in IndexedDB.
3. User can reopen drafts from Saved Forms.
4. User finalizes form and generates PDF.
5. If online, summary syncs to Firestore.
6. If offline, form should remain `pending_sync`.

## Firestore
### Collections
- `users`
- `formSummaries`
- `espacios` — catálogo de espacios de atención (gestionado por admin/supervisor)

### Key rules
- Keep a single `formSummaries` collection.
- Separate years using `vigencia`.
- Remote form document should be idempotent using:
  - `${userId}_${localFormId}`

### Important fields in `formSummaries`
- `userId`
- `userEmail`
- `localFormId`
- `remoteFormId`
- `createdAt`
- `updatedAt`
- `vigencia`
- `observacionesGenerales`
- `hasObservaciones`
- `contratista`
- `espacioAtencion`
- `fechaVisita`
- `horaVisita`
- `tipoEspacio`
- `porcentajeCumplimiento`
- `puntajeTotal`
- `puntajePorComponente`
- `detalleItems`

### Important fields in `espacios`
- `nombre` (string)
- `tipo` (`cdvfijo` | `cdvparque`)
- `activo` (boolean)
- `updatedAt` (serverTimestamp)

## Local Persistence
IndexedDB stores:
- drafts
- sync status
- local session

localStorage also stores:
- `espacios_catalogo` — caché offline del catálogo de espacios (array JSON)

Local sync states:
- `pending_sync`
- `synced`
- `sync_error`

## Important Files
- `src/App.js`
- `src/services/dbService.js`
- `src/services/formDataService.js`
- `src/services/dashboardService.js`
- `src/services/userRoleService.js`
- `src/services/catalogService.js`
- `src/components/SavedForms.jsx`
- `src/components/HeaderForm.jsx`
- `src/components/dashboard/Dashboard.jsx`
- `src/components/dashboard/BitacoraObservaciones.jsx`
- `src/components/catalogos/CatalogosPanel.jsx`

## Current Decisions
- Single Firestore collection: `formSummaries`
- Use `vigencia` instead of yearly collections
- Save observations in PDF, Dexie, and Firestore
- Dashboard reads from Firestore, not local drafts
- Remote sync must be idempotent
- Dashboard default filter is `vigencia: 2026` (numeric)
- Old docs without `vigencia` field are filtered by inferring the year from `fechaVisita`
- Local autosave is temporarily disabled; drafts are currently saved manually and before finalizing
- Catálogo de espacios usa caché offline-first: se carga desde `localStorage` al abrir el formulario y se refresca desde Firestore en segundo plano
- El campo "Espacio de Atención" en `HeaderForm` usa `<Autocomplete freeSolo>` alimentado por el catálogo; permite escritura libre si el espacio no está en la lista
- La importación masiva de espacios usa `writeBatch` en chunks de 500 (límite de Firestore)

## Dashboard Filters
- `vigencia` (number | `'todos'`): default `2026`. Applied in `dashboardService.js` with fallback to `fechaVisita` year for legacy docs.
- `tipoEspacio`: `'todos'` | `'cdvfijo'` | `'cdvparque'`
- `contratista`: `'todos'` | string
- `fechaInicio` / `fechaFin`: ISO date strings

## Catálogo de Espacios
- `catalogService.js` expone: `getEspacios`, `getEspaciosFromCache`, `addEspacio`, `updateEspacio`, `deleteEspacio`, `importarEspaciosCSV`
- `CatalogosPanel.jsx` permite CRUD completo y carga masiva vía CSV
- CSV esperado: encabezados `nombre,tipo` (separador `,` o `;`). Si `tipo` está ausente o es inválido, se asigna `cdvfijo` por defecto
- Solo espacios con `activo: true` aparecen en el Autocomplete del formulario

## Pending Work
1. Prevent remote sync attempts when offline.
2. Add `isFinalizing` to block double finalize clicks.
3. Add manual retry sync action in Saved Forms.
4. Improve local draft UX.

## Testing Checklist
- Save local draft and reopen it.
- Finalize offline and confirm `pending_sync`.
- Reconnect and sync successfully.
- Confirm Firestore document uses stable ID.
- Confirm dashboard shows observation log when Firestore has `observacionesGenerales`.
- Confirm dashboard loads only 2026 docs by default.
- Confirm legacy docs (no `vigencia` field) are excluded via `fechaVisita` year inference.
- Confirm Catálogos tab is visible only for admin and supervisor roles.
- Add an espacio, verify it appears in the HeaderForm Autocomplete.
- Import a CSV, verify batch write and table refresh.
- Go offline, open HeaderForm, verify cached espacios load from localStorage.
