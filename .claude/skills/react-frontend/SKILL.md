---
name: react-frontend
description: Cómo escribir el frontend de Herramientas Ya con React, TypeScript, Vite y React Router, tal como lo enseñó la cátedra en guia-react-frontend.pdf (pasos 0 a 13). Cubre el único apiFetch en api/client.ts, una función por endpoint con su tipo, useFetch para cargando, error y datos, AuthContext con can(), ProtectedRoute y Layout, pantallas de listado, alta, edición y baja con ConfirmButton, y la regla "ocultar no es proteger". Usala siempre que haya que crear o cambiar una pantalla, un componente, un formulario, una llamada a la API, la sesión o la navegación en frontend/, aunque el pedido no diga "React" (por ejemplo "hacé la pantalla de mis alquileres" o "mostrá el botón confirmar solo al propietario").
---

# Frontend con React, como en la cátedra

La guía de React de la cátedra arma el frontend por capas. **Cada capa usa solo la de abajo**: una página no llama a `fetch`, llama a `getHerramientas()`; `getHerramientas()` no sabe de tokens, llama a `apiFetch()`; y solo `apiFetch()` sabe cómo se habla con el backend.

| Capa | Archivo | Responsabilidad | No sabe de… | Paso de la guía |
| --- | --- | --- | --- | --- |
| Cliente HTTP | `api/client.ts` | el **único** `fetch`: URL base, token, errores, 401 | React, pantallas | 8 |
| Acceso a datos | `api/<recurso>.ts` + `api/types.ts` | una función por endpoint, con su tipo | cómo se muestran los datos | 8 |
| Estado global | `context/AuthContext.tsx` + `useAuth.ts` | quién está logueado, sus permisos, `login`, `logout`, `can()` | cómo se dibuja cada pantalla | 9 |
| Lógica reutilizable | `hooks/useFetch.ts` | cargando, error y datos de cualquier pedido | qué endpoint ni qué pantalla | 10 |
| Presentación | `pages/`, `components/` | dibujar y reaccionar a clics | URLs, headers, `fetch` | 9 a 13 |

Es la misma idea que el backend: `pages/` es como `api/` (routers), `hooks/` y `context/` como `services/`, `api/<recurso>.ts` como `repositories/` y `api/types.ts` como `api/model/`.

El código base (client, useFetch, AuthContext, ProtectedRoute, Layout, ConfirmButton, ErrorMessage) y una pantalla completa de ejemplo están en [references/codigo.md](references/codigo.md).

## Orden para una pantalla nueva

1. **Probá el endpoint en Swagger** (`http://localhost:8000/docs`): qué recibe, qué devuelve y qué errores da. Es lo primero que dice la guía.
2. **Tipos** en `api/types.ts`: una interfaz por request y por response, copiadas del `api/model/*.py` del backend, con un comentario que diga de qué endpoint salen (`// GET /herramientas/{id}`). Los montos llegan como string (`"1500.00"`) porque son `Decimal`.
3. **Función de acceso** en `api/<recurso>.ts`: una arrow function por endpoint que llama a `apiFetch<T>`. Todo texto que el usuario escribe y va en la URL pasa por `encodeURIComponent` (práctica 3) o por `URLSearchParams`.
4. **Página** en `pages/<Nombre>Page.tsx`:
   - `useFetch(() => getX(...), [deps])` para leer;
   - `try/catch` con `actionError` para las acciones;
   - `reload()` después de modificar.
5. **Ruta** en `App.tsx`: las privadas dentro de `<Route element={<ProtectedRoute />}>` y `<Route element={<Layout />}>`, y el link en el menú de `Layout`.
6. **Permisos**:
   - Cada acción se envuelve en `can(P.XXX)` con el **mismo** permiso que pide el backend.
   - Si además depende de la propiedad, comparalo con `user.id`: confirmar solo si la herramienta es mía.
7. **Probar con dos usuarios**: uno que puede y uno que no. Con "Mostrar todos los botones" (paso 12) el backend tiene que responder 403 y la pantalla mostrar el mensaje.

## Reglas de la guía que respetamos

- **Ocultar no es proteger** (paso 12). `can()` es experiencia de usuario: no mostramos botones que van a fallar. La seguridad la da la API, porque cualquiera puede mandar el request a mano.
- **Los tres estados** de todo pedido: `loading` ("Cargando…"), `error` (`<ErrorMessage>`) y `data`. Nunca una pantalla en blanco.
- **El 401 lo maneja `apiFetch`**: con token, un 401 es una sesión vencida, así que llama al `logout` del `AuthContext` y muestra "Tu sesión venció". Ninguna pantalla vuelve a chequear el 401.
- **Formularios**:
  - `event.preventDefault()`;
  - inputs controlados con `useState`;
  - `required`, `minLength` y `type` para la validación del navegador;
  - el error de la API (`detail`) se muestra tal cual, porque `apiFetch` ya lo hace legible (incluidos los 422).
- **Acciones irreversibles** (cancelar, rechazar, suspender) con `ConfirmButton`, que pide un segundo clic (`RNF-11`).
- **Tipos**: `import type` para los tipos; `SubmitEvent` para el submit, como en la guía.
- **Variables de entorno**: `VITE_API_URL` en `.env.development`. Después de crearlo o cambiarlo, hay que reiniciar Vite.

## Diferencias con la cátedra (a propósito)

| Cátedra | Herramientas Ya | Por qué |
| --- | --- | --- |
| La sesión se arma con 3 pedidos (`/user/me/id`, `/user/{id}`, `/role/{id}` por rol) | `GET /me` devuelve el usuario con `roles` y `permisos` | Un pedido en lugar de 2 + N (`RNF-09`). El `AuthContext` queda igual por fuera |
| Estilos mínimos, `style={{ color: 'crimson' }}` | Clases en `index.css` con variables de diseño | `RNF-10` y `RNF-12`; el diseño lo define Federico |
| `apiFetch` solo manda JSON | Si `body` es `FormData`, no se pone `Content-Type` | Subida de fotos (`RF-08`) |
| Permisos como strings (`'delete_users'`) | Constantes en `api/permisos.ts`, espejo de `model/permisos.py` | Un error de tipeo lo detecta TypeScript |

## Usabilidad (lo que evalúa la cátedra)

- `RNF-10`:
  - cada input con `<label htmlFor>` y `placeholder`;
  - mensajes en español;
  - "Cargando…" visible;
  - botones deshabilitados mientras se envía, para evitar el doble envío.
- `RNF-12`: se prueba a 375 px de ancho (DevTools, modo dispositivo). Las tablas largas pasan a tarjetas en el celular.
- Fechas en formato `dd/mm/aaaa` y montos con `toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })`. Se formatean en un solo lugar: `utils/formato.ts`.

## Antes de terminar

- [ ] `grep -rn "fetch(" src` aparece solo en `api/client.ts`.
- [ ] Cada botón de acción está envuelto en `can()` con el permiso que exige el backend.
- [ ] La pantalla muestra cargando, error y vacío ("Todavía no publicaste herramientas").
- [ ] `npm run lint` y `npm run build` pasan (el build corre `tsc`).
- [ ] Probado con un usuario que puede y con uno que no, y a 375 px de ancho.
