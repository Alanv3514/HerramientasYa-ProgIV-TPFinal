---
name: jwt-permisos
description: Autenticación con JWT, contraseñas con bcrypt, roles y permisos en Herramientas Ya, como lo enseñó la cátedra (utils/hash.py, JWTService, POST /login, JWTAuthMW con @protected, get_current_user_id, permission_check y seed de roles y permisos). Usala siempre que una tarea toque login, registro, tokens, el usuario logueado, roles, permisos, rutas protegidas, propiedad de un recurso, suspensión o validación de usuarios, o cuando haya un 401 o un 403 que explicar.
---

# JWT, roles y permisos, como en la cátedra

La cátedra armó la seguridad en dos capas. Hay que distinguirlas, porque en la mesa preguntan justamente la diferencia:

| Pregunta | Quién responde | Error |
| --- | --- | --- |
| ¿Quién sos? (autenticación) | `JWTAuthMW` + `@protected`: el token es válido y no venció | 401 |
| ¿Tu rol te deja hacer esto? (autorización) | `permission_check("permiso")` | 403 |
| ¿Este recurso es tuyo? (propiedad, `RNF-03`) | el servicio, comparando con `CurrentUserIdDep` | 403 |
| ¿Tu cuenta está habilitada? (`RN-10`) | `usuario_habilitado` | 403 |

Las dos primeras son de la cátedra. Las dos últimas las agrega este proyecto con el mismo estilo. El código completo de cada pieza está en [references/codigo.md](references/codigo.md).

## Piezas y dónde viven

| Archivo | Qué hace | Paso de `jwt-guide.md` |
| --- | --- | --- |
| `utils/hash.py` | `hash_password` y `verify_password` con passlib + bcrypt | Paso 1 |
| `services/jwt.py` | `JWTService`: `create_access_token({"sub": email})` y `decode_token` (None si venció o fue alterado) | Paso 2 |
| `config.py` | `Settings(BaseSettings)` lee `JWT_SECRET_KEY` y `JWT_EXPIRE_MINUTES` de `.env` | Paso 2 (lo que la guía recomienda) |
| `services/login.py` + `api/login.py` | `POST /auth/login`: verifica y devuelve `{msg, token}` | Paso 3 |
| `api/middlewares/auth.py` | `JWTAuthMW.check_jwt`, dependencia global de la app: si el endpoint tiene `@protected`, exige `Authorization: Bearer` válido y guarda el payload en `request.state` | Paso 4 |
| `api/middlewares/protected.py` | el decorador `@protected` que marca el endpoint | Paso 4 |
| `dependencies.py` | `CurrentUserIdDep`: el id del usuario logueado | Paso 4 |
| `api/permisos.py` | `permission_check(p)` y `usuario_habilitado` | `api/users.py` de la cátedra |
| `model/permisos.py` | el catálogo de permisos y roles, como constantes | — |
| `repositories/seed.py` | crea roles y permisos al iniciar | `seed.py` de la cátedra |

## Pasos para proteger una ruta nueva

1. Elegí el permiso del catálogo de `model/permisos.py`. Si hace falta uno nuevo, agregalo ahí y asignáselo a los roles en `ROL_PERMISOS`. El seed lo crea al iniciar. Nunca escribas el nombre del permiso como string suelto en el router: usá la constante, así un error de tipeo falla al importar y no en la mesa.
2. En el router: `@protected` debajo del `@router.<método>` y `dependencies=[Depends(permission_check(P.PUBLICAR_HERRAMIENTAS))]`.
3. Si la acción opera sobre algo que tiene dueño, recibí `me_id: CurrentUserIdDep` y pasáselo al servicio, que lanza `NoEsDuenioError` si no corresponde (ver `/fastapi-sqlmodel`).
4. Si la acción es publicar, alquilar, calificar o gestionar solicitudes, sumá `Depends(usuario_habilitado)`: un `PENDIENTE` o `SUSPENDIDO` recibe 403 (`RN-10`).
5. Tests mínimos (ver `/pytest-api`):
   - sin token → 401;
   - token de un rol sin el permiso → 403;
   - otro usuario con el mismo rol (no dueño) → 403;
   - el caso correcto → 200 o 201.

## Catálogo de este proyecto

Sale de la sección 3 de `docs/requisitos.md`:

| Permiso | ADMIN | PROPIETARIO | CLIENTE |
| --- | :-: | :-: | :-: |
| `ver_usuarios`, `validar_usuarios` | ✓ | | |
| `gestionar_categorias` | ✓ | | |
| `moderar_herramientas` | ✓ | | |
| `publicar_herramientas` | | ✓ | |
| `gestionar_solicitudes` (confirmar, rechazar, entregar, devolver) | | ✓ | |
| `solicitar_alquileres` (solicitar, cancelar) | | | ✓ |
| `calificar` | | ✓ | ✓ |

El catálogo y la búsqueda son públicos. Un usuario puede tener varios roles: los permisos se suman, igual que en `fetchSession` del frontend de la cátedra.

## Seguridad que evalúa la cátedra

- **`RNF-01`:**
  - La contraseña se guarda hasheada y nunca sale en una respuesta.
  - El `response_model` de usuario no tiene `password`.
  - No se loguea el body del login.
- **`RNF-02`:**
  - La clave sale de `.env`, nunca hardcodeada como en `get_jwt_service()` de la cátedra.
  - El token vence (30 minutos, como la guía).
  - El payload lleva solo `sub` (el email), porque el JWT se puede leer en jwt.io: está firmado, no encriptado.
- **Login:**
  - Credenciales incorrectas → 401 con un mensaje genérico ("Email o contraseña incorrectos"), sin decir cuál de los dos falló.
  - Usuario `SUSPENDIDO` → 403 (`RF-02`).
- **`RNF-06`:** límite de intentos por IP en el login. Con un diccionario en memoria de `ip → [tiempos]` alcanza para la mesa, en el mismo estilo que `CounterMW` de la cátedra.
- **Límites conocidos:** no hay refresh token ni revocación al hacer logout. Son los límites que la guía nombra en su cierre: si preguntan, se responde con eso.

## Antes de terminar

- [ ] Ninguna ruta privada sin `@protected`. Buscalo con `grep -n "@router" api/*.py` y revisá que cada una tenga su decorador o sea pública a propósito.
- [ ] Ningún permiso escrito como string suelto fuera de `model/permisos.py`.
- [ ] Tests de 401, 403 por rol y 403 por propiedad pasan.
- [ ] `.env.example` tiene `JWT_SECRET_KEY=` sin valor real.
