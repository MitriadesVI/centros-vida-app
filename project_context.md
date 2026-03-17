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
- `admin`: dashboard, admin, forms
- `supervisor`: dashboard, forms
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

## Local Persistence
IndexedDB stores:
- drafts
- sync status
- local session

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
- `src/components/SavedForms.jsx`
- `src/components/dashboard/Dashboard.jsx`
- `src/components/dashboard/BitacoraObservaciones.jsx`

## Current Decisions
- Single Firestore collection: `formSummaries`
- Use `vigencia` instead of yearly collections
- Save observations in PDF, Dexie, and Firestore
- Dashboard reads from Firestore, not local drafts
- Remote sync must be idempotent
- Dashboard default filter is `vigencia: 2026` (numeric)
- Old docs without `vigencia` field are filtered by inferring the year from `fechaVisita`
- Local autosave is temporarily disabled; drafts are currently saved manually and before finalizing

## Dashboard Filters
- `vigencia` (number | `'todos'`): default `2026`. Applied in `dashboardService.js` with fallback to `fechaVisita` year for legacy docs.
- `tipoEspacio`: `'todos'` | `'cdvfijo'` | `'cdvparque'`
- `contratista`: `'todos'` | string
- `fechaInicio` / `fechaFin`: ISO date strings

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
