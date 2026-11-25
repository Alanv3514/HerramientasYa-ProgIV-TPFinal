# Frontend

Interfaz de Herramientas Ya con React, TypeScript y Vite, como la guía `guia-react-frontend.pdf` de la cátedra.

| Carpeta (en `src/`) | Qué va |
| --- | --- |
| `api/` | `client.ts` con el único `apiFetch`, `types.ts`, `permisos.ts` y una función por endpoint con su tipo |
| `context/` | `AuthContext` con la sesión y `can()` |
| `hooks/` | `useFetch` y otros hooks |
| `components/` | Componentes reutilizables (`ErrorMessage`, `ConfirmButton`, `Layout`, `ProtectedRoute`) |
| `pages/` | Una pantalla por ruta |
| `utils/` | `formato.ts`: fechas (dd/mm/aaaa) y montos (ARS), en un solo lugar |

- **Cómo se escribe:** skill `/react-frontend`.
- **Variables:** `VITE_API_URL` (la URL de la API) está en `frontend/.env.development`, que se sube porque no tiene secretos. Vite no lee el `.env` de la raíz. Si la cambiás, reiniciá Vite.

## Cómo se levanta

Con Node 22 o más, desde `frontend/`:

```bash
npm install
npm run dev       # http://localhost:5174
npm run lint      # oxlint
npm run build     # typecheck (tsc) y build de producción
```

El puerto es fijo (5174, `strictPort`) porque el backend solo acepta ese origen (`CORS_ORIGIN`). Si está ocupado, Vite falla en lugar de elegir otro.

Con Docker (`docker compose up --build` desde la raíz) el frontend se compila y lo sirve nginx, también en el 5174. Ahí `VITE_API_URL` sale del `.env` de la raíz, porque Vite la inserta al compilar.

Con la API levantada, la pantalla de inicio muestra «API conectada». Si dice «No se pudo conectar con el servidor», la API está apagada o `CORS_ORIGIN` no coincide.
