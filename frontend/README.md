# Frontend

Interfaz de Herramientas Ya con React, TypeScript y Vite, como la guía `guia-react-frontend.pdf` de la cátedra.

| Carpeta (en `src/`) | Qué va |
| --- | --- |
| `api/` | `client.ts` con el único `apiFetch`, y una función por endpoint con su tipo |
| `context/` | `AuthContext` con la sesión y `can()` |
| `hooks/` | `useFetch` y otros hooks |
| `components/` | Componentes reutilizables (`Layout`, `ProtectedRoute`, `ConfirmButton`) |
| `pages/` | Una pantalla por ruta |

- **Cómo se escribe:** skill `/react-frontend`.
- **Variables:** `VITE_API_URL` apunta a la API. Vite no lee el `.env` de la raíz; la tarjeta #5 define cómo se carga en desarrollo.
- **Cómo se levanta:** se completa en la tarjeta #5.
