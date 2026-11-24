# Herramientas Ya: documento de requisitos

Versión 0.2 (alineada con la propuesta enviada a la cátedra, [`propuesta.txt`](propuesta.txt)) · Programación IV, UTN TUP 2026

Este documento define qué hace el sistema, con qué reglas y cómo se construye. Es la base para armar las tarjetas del tablero: cada requisito (`RF-xx`, `RN-xx`, `RNF-xx`) debería terminar en una o más tarjetas.

## 1. Alcance

**Objetivo:** que los estudiantes alquilen por día, a otros estudiantes o egresados, las herramientas y equipos que necesitan para sus trabajos prácticos, con reservas por fecha, cálculo de costos, control de disponibilidad y reputación de los usuarios.

**Dentro del alcance**

- Registro, inicio de sesión y roles con permisos.
- Publicación de herramientas con fotos.
- Búsqueda con filtros y disponibilidad por fechas.
- Alquileres con ciclo de vida, cálculo de costo, depósito y recargo por atraso.
- Calificaciones mutuas e historial.
- Validación de usuarios (estudiantes o egresados, por carrera y legajo), gestión de categorías y carreras, y moderación por parte del administrador.

**Fuera del alcance**

- Pagos: el sistema registra montos y depósitos, pero el cobro se acuerda entre las partes por fuera de la plataforma. No hay pasarela de pagos.
- Mapas, geolocalización y envíos: la entrega y la devolución se acuerdan entre las partes (por ejemplo, en la facultad).
- Chat entre usuarios y notificaciones por mail o push.
- Aplicación móvil nativa: el frontend es web y responsive.

## 2. Arquitectura y tecnologías

| Parte | Decisión |
|---|---|
| Repositorio | Monorepo: `backend/`, `frontend/`, `docs/`, `.github/workflows/` |
| Backend | Python, FastAPI, SQLModel, Pydantic. Escrito desde cero, en capas: `api/` (routers), `services/` (reglas de negocio), `repositories/` (acceso a datos), `model/` (tablas y esquemas) |
| Autenticación | JWT (`Authorization: Bearer`), contraseñas con bcrypt, permisos por rol |
| Base de datos | PostgreSQL en Docker. Los tests usan SQLite en memoria |
| Archivos | Fotos guardadas en disco, en un volumen de Docker, servidas por la API |
| Frontend | React, TypeScript y Vite. Capa `api/` con un único `apiFetch`, hooks (`useFetch`), `pages/` y `components/`. React Router para la navegación |
| Infraestructura | Docker Compose: `db` (Postgres), `api` (FastAPI) y `web` (frontend). Un solo `docker compose up` levanta todo |
| CI | GitHub Actions en cada pull request: pytest con cobertura, lint y build del frontend. Si falla, no se puede mergear a `main` |

```
HerramientasYa-ProgIV-TPFinal/
├── backend/
│   ├── api/  services/  repositories/  model/  utils/
│   ├── tests/
│   └── main.py
├── frontend/
│   └── src/  api/  hooks/  pages/  components/
├── docs/
├── docker-compose.yml
└── .github/workflows/
```

## 3. Roles y permisos

Un usuario puede tener varios roles a la vez. Al registrarse elige **PROPIETARIO**, **CLIENTE** o los dos, y puede sumar el otro más adelante. **ADMIN** no se elige: se asigna desde la base o por otro admin.

| Permiso | ADMIN | PROPIETARIO | CLIENTE |
|---|:-:|:-:|:-:|
| Ver catálogo y buscar | ✓ | ✓ | ✓ |
| Publicar, editar y pausar sus herramientas | | ✓ | |
| Solicitar alquileres | | | ✓ |
| Confirmar o rechazar solicitudes, registrar entrega y devolución de sus herramientas | | ✓ | |
| Cancelar sus solicitudes | | | ✓ |
| Calificar al otro en un alquiler finalizado | | ✓ | ✓ |
| Validar o suspender usuarios | ✓ | | |
| Gestionar categorías | ✓ | | |
| Gestionar carreras | ✓ | | |
| Ocultar publicaciones | ✓ | | |

Además de los permisos por rol, el backend verifica la **propiedad** del recurso: un propietario solo confirma alquileres de sus herramientas y un cliente solo cancela sus propias solicitudes (ver `RNF-03`).

## 4. Requisitos funcionales

### Usuarios y autenticación

- **RF-01 Registro.** Nombre, apellido, email único, contraseña (mínimo 8 caracteres), teléfono, carrera (de una lista), legajo y rol o roles elegidos. El usuario queda en estado `PENDIENTE`.
- **RF-02 Inicio de sesión.** Con email y contraseña. Devuelve un JWT con vencimiento. Un usuario `SUSPENDIDO` no puede entrar.
- **RF-03 Perfil.** Ver y editar sus datos, ver su reputación y sumar el rol que no tenga.
- **RF-04 Validación de usuarios.** El ADMIN lista los usuarios pendientes y, después de verificar con la carrera y el legajo que sean estudiantes o egresados, los valida o rechaza. Un usuario `PENDIENTE` puede entrar y buscar, pero no publicar ni alquilar.
- **RF-05 Suspensión.** El ADMIN suspende o reactiva usuarios, indicando el motivo.

### Categorías y carreras

- **RF-06 ABM de categorías.** Solo el ADMIN. No se puede borrar una categoría con herramientas asociadas.
- **RF-24 ABM de carreras.** Solo el ADMIN. Se cargan unas carreras iniciales (seed) y el ADMIN agrega o edita las que falten. No se puede borrar una carrera con usuarios o herramientas asociadas.

### Herramientas

- **RF-07 Publicar.** Nombre, descripción, categoría, carreras en las que se usa (una o más), materias para las que sirve (texto libre opcional, por ejemplo «Electrónica I, Taller de soldadura»), estado de conservación (`NUEVA`, `MUY_BUENA`, `BUENA`, `CON_DETALLES`), precio por día y depósito en garantía.
- **RF-08 Fotos.** De 1 a 3 fotos por herramienta, con las validaciones de `RNF-04`.
- **RF-09 Editar y cambiar estado.** El propietario edita su herramienta y la pasa a `ACTIVA`, `INACTIVA` o `FUERA_DE_SERVICIO`.
- **RF-10 Baja.** Lógica (pasa a `INACTIVA`), nunca física, para no perder el historial.
- **RF-11 Mis herramientas.** El propietario ve sus publicaciones con las solicitudes pendientes de cada una.

### Búsqueda

- **RF-12 Catálogo.** Lista paginada de herramientas `ACTIVA` de usuarios validados, con foto, precio por día, carreras, materias y reputación del propietario.
- **RF-13 Filtros.** Por categoría, rango de precio, palabra clave (nombre, descripción o materias), carrera y disponibilidad entre dos fechas (por ejemplo, la semana de una entrega). Los filtros se combinan.
- **RF-14 Detalle.** Datos completos, fotos, calendario de fechas ocupadas, reputación y últimas reseñas del propietario.

### Alquileres

- **RF-15 Solicitar.** El cliente elige fecha de inicio y fin. Antes de confirmar ve el costo calculado (`RN-05`).
- **RF-16 Ciclo de vida.**

  ```
  SOLICITADO ──confirmar──▶ CONFIRMADO ──entregar──▶ EN_CURSO ──devolver──▶ FINALIZADO
       │                        │
       ├──rechazar──▶ RECHAZADO │
       └──cancelar──▶ CANCELADO ◀──cancelar──┘
  ```

  | Transición | Quién la hace |
  |---|---|
  | confirmar, rechazar, entregar, devolver | propietario |
  | cancelar | cliente, solo desde `SOLICITADO` o `CONFIRMADO` |

- **RF-17 Registro de operaciones.** Cada cambio de estado guarda quién lo hizo, cuándo y el estado anterior y el nuevo.
- **RF-18 Devolución.** Al registrarla, el sistema calcula el recargo por atraso (`RN-07`) y el depósito a devolver.
- **RF-19 Mis alquileres.** El cliente ve sus alquileres y el propietario los de sus herramientas, filtrables por estado.

### Calificaciones

- **RF-20 Calificar.** Con el alquiler `FINALIZADO`, cada parte califica a la otra de 1 a 5 estrellas, con comentario opcional. Una sola vez por parte y por alquiler.
- **RF-21 Reputación.** Promedio y cantidad de calificaciones, separadas como propietario y como cliente. Se muestra en las publicaciones y en las solicitudes recibidas.

### Historial y moderación

- **RF-22 Historial.** Por herramienta (alquileres), por propietario (alquileres e ingresos generados) y por cliente (alquileres y gastos).
- **RF-23 Moderación.** El ADMIN oculta una publicación indicando el motivo. Deja de aparecer en el catálogo, pero el propietario la sigue viendo.

## 5. Reglas de negocio

| Código | Regla |
|---|---|
| RN-01 | Un usuario no puede alquilar su propia herramienta. |
| RN-02 | Solo se alquilan herramientas `ACTIVA`, no ocultas, de propietarios validados y no suspendidos. |
| RN-03 | Fechas: inicio desde hoy en adelante, fin igual o posterior al inicio, máximo 30 días por alquiler. |
| RN-04 | No se aceptan rangos que se superpongan con un alquiler `CONFIRMADO` o `EN_CURSO` de la misma herramienta. Las fechas son inclusivas: el 1 al 3 y el 3 al 5 se superponen. |
| RN-05 | Días = fin − inicio + 1. Costo = días × precio por día. El cliente ve el costo más el depósito. Los montos se guardan al solicitar, así no cambian si después el propietario modifica el precio. |
| RN-06 | Al confirmar un alquiler, las demás solicitudes `SOLICITADO` superpuestas de esa herramienta pasan a `RECHAZADO` automáticamente. |
| RN-07 | Recargo por atraso = días de atraso × precio por día. Se descuenta del depósito. Si el recargo supera el depósito, la diferencia queda registrada como deuda del cliente. |
| RN-08 | La cancelación solo se permite antes de `EN_CURSO`. |
| RN-09 | Solo se califica un alquiler `FINALIZADO`, una vez por parte. |
| RN-10 | Un usuario `PENDIENTE` o `SUSPENDIDO` no publica ni alquila. Al suspender a un propietario, sus solicitudes `SOLICITADO` se rechazan. |
| RN-11 | Una herramienta con alquileres `CONFIRMADO` o `EN_CURSO` no se puede pasar a `INACTIVA` ni a `FUERA_DE_SERVICIO`. |

Las reglas viven en `services/` y cada una tiene al menos un test con pytest.

## 6. Modelo de datos

```
usuario ──< usuario_rol >── rol ──< rol_permiso >── permiso
   │
   ├──> carrera
   │
   ├──< herramienta >── categoria
   │        ├──< herramienta_carrera >── carrera
   │        └──< foto_herramienta
   │
   ├──< alquiler (como cliente) >── herramienta
   │        ├──< historial_estado_alquiler
   │        └──< calificacion
```

| Tabla | Campos principales |
|---|---|
| `usuario` | id, nombre, apellido, email (único), password_hash, telefono, carrera_id, legajo, estado (`PENDIENTE`, `VALIDADO`, `SUSPENDIDO`), creado_en |
| `rol`, `permiso` y las tablas intermedias | como en la cátedra: un rol tiene permisos y un usuario tiene roles |
| `categoria` | id, nombre (único), descripcion |
| `carrera` | id, nombre (único). Carga inicial por seed; después la gestiona el ADMIN (`RF-24`) |
| `herramienta_carrera` | herramienta_id, carrera_id. Relación N-N, como `usuario_rol` en la cátedra |
| `herramienta` | id, propietario_id, categoria_id, nombre, descripcion, materias (opcional), conservacion, precio_dia, deposito, estado, oculta, motivo_oculta, creado_en |
| `foto_herramienta` | id, herramienta_id, archivo, orden |
| `alquiler` | id, herramienta_id, cliente_id, fecha_inicio, fecha_fin, dias, precio_dia, costo, deposito, estado, fecha_devolucion, dias_atraso, recargo, deposito_devuelto, deuda, creado_en |
| `historial_estado_alquiler` | id, alquiler_id, estado_anterior, estado_nuevo, usuario_id, fecha |
| `calificacion` | id, alquiler_id, autor_id, calificado_id, rol_calificado (`PROPIETARIO` o `CLIENTE`), puntaje, comentario, fecha. Única por (alquiler_id, autor_id) |

Los montos se guardan como `Decimal`, no como `float`, para evitar errores de redondeo.

## 7. API (borrador)

Todas las rutas, salvo registro, login y catálogo público, requieren `Authorization: Bearer <token>`.

| Método y ruta | Descripción | Permiso |
|---|---|---|
| `POST /auth/register` | Registro | público |
| `POST /auth/login` | Login, devuelve JWT | público |
| `GET /me`, `PATCH /me` | Ver y editar mi perfil | autenticado |
| `GET /users?estado=PENDIENTE` | Listar usuarios | ADMIN |
| `PATCH /users/{id}/estado` | Validar, suspender o reactivar | ADMIN |
| `GET /carreras`, `POST`, `PATCH`, `DELETE /carreras/{id}` | Carreras | lectura pública, escritura ADMIN |
| `GET /categorias`, `POST`, `PATCH`, `DELETE /categorias/{id}` | Categorías | lectura pública, escritura ADMIN |
| `GET /herramientas?categoria=&min=&max=&q=&carrera=&desde=&hasta=&page=` | Catálogo con filtros | público |
| `GET /herramientas/{id}` | Detalle con fechas ocupadas | público |
| `POST /herramientas`, `PATCH /herramientas/{id}` | Publicar y editar | PROPIETARIO dueño |
| `POST /herramientas/{id}/fotos`, `DELETE /herramientas/{id}/fotos/{foto_id}` | Fotos | PROPIETARIO dueño |
| `PATCH /herramientas/{id}/moderacion` | Ocultar o mostrar | ADMIN |
| `GET /me/herramientas` | Mis herramientas | PROPIETARIO |
| `POST /alquileres` | Solicitar | CLIENTE validado |
| `GET /alquileres?como=cliente\|propietario&estado=` | Mis alquileres | autenticado |
| `POST /alquileres/{id}/confirmar`, `/rechazar`, `/entregar`, `/devolver` | Transiciones del propietario | PROPIETARIO dueño |
| `POST /alquileres/{id}/cancelar` | Cancelar | CLIENTE dueño |
| `POST /alquileres/{id}/calificaciones` | Calificar | parte del alquiler |
| `GET /usuarios/{id}/reputacion` | Reputación y reseñas | público |
| `GET /me/historial` | Historial e ingresos o gastos | autenticado |

Los errores siguen el formato de FastAPI (`{"detail": "..."}`) con códigos coherentes: 400 regla de negocio, 401 sin token o vencido, 403 sin permiso o no es el dueño, 404 no existe, 409 conflicto de fechas, 422 validación.

## 8. Pantallas del frontend

| Pantalla | Quién la usa |
|---|---|
| Login y registro | todos |
| Catálogo con filtros y paginación | todos |
| Detalle de herramienta, con calendario de ocupación y formulario de solicitud | todos (solicitar: CLIENTE) |
| Mis herramientas: alta, edición, fotos y estado | PROPIETARIO |
| Solicitudes recibidas: confirmar, rechazar, entregar y devolver | PROPIETARIO |
| Mis alquileres: estado, cancelar y calificar | CLIENTE |
| Perfil y reputación | todos |
| Historial e ingresos | PROPIETARIO y CLIENTE |
| Panel de administración: usuarios pendientes, suspensiones, categorías, carreras y moderación | ADMIN |

La interfaz muestra u oculta acciones según los permisos del usuario. Es solo experiencia de usuario: el control real lo hace la API (`RNF-03`).

## 9. Requisitos no funcionales

La cátedra evalúa principalmente seguridad, rendimiento y usabilidad.

### Seguridad

- **RNF-01** Contraseñas con bcrypt. Nunca se devuelven ni se loguean.
- **RNF-02** JWT con vencimiento. La clave secreta va en `.env`, que no se sube al repo (hay un `.env.example`).
- **RNF-03** Toda acción verifica en el backend el permiso del rol y la propiedad del recurso, para evitar que un usuario opere sobre datos ajenos cambiando el id en la URL.
- **RNF-04** Fotos: solo JPG, PNG o WEBP, validando el contenido real del archivo y no solo la extensión. Máximo 2 MB por foto y 3 por herramienta. Se guardan con un nombre generado por el sistema, nunca con el nombre original.
- **RNF-05** CORS restringido al origen del frontend. Validación de todos los datos de entrada con Pydantic.
- **RNF-06** Límite de intentos de login por IP para frenar ataques de fuerza bruta.

### Rendimiento

- **RNF-07** Listados paginados (por defecto 20 por página).
- **RNF-08** Filtros y control de superposición resueltos en una consulta SQL, no trayendo todo a Python. Índices en `herramienta(categoria_id, estado)` y en `alquiler(herramienta_id, fecha_inicio, fecha_fin)`.
- **RNF-09** Evitar el problema N+1 al listar herramientas con propietario, foto y reputación.

### Usabilidad

- **RNF-10** Todos los campos con label y placeholder, mensajes de error claros en español y estados de carga visibles.
- **RNF-11** Confirmación antes de acciones irreversibles (cancelar, rechazar, suspender).
- **RNF-12** Diseño responsive: usable desde el celular.

### Calidad

- **RNF-13** Tests con pytest: unitarios para cada regla de negocio y de integración para los endpoints. Cobertura objetivo: 70 % o más en `services/`.
- **RNF-14** Lint en backend (ruff) y frontend (oxlint). El CI bloquea el merge si fallan los tests, el lint o el build.

## 10. Gestión del proyecto

El detalle está en [`docs/gestion/como-trabajamos.md`](gestion/como-trabajamos.md), copiado en el issue fijado #1.

- **Tablero:** un solo GitHub Project fullstack. Cada tarjeta es un issue (#3 a #50, armados a partir de este documento).
- **Columnas:** 📌 Cómo trabajamos, Backlog, Para hacer, En curso (máximo 2 por persona), En revisión y Hecho.
- **Campos:** Área (`Backend`, `Frontend`, `Infra`, `Docs`), Módulo, Prioridad, Talle (S, M, L) e Iteración (1, 2 y 3, de una semana cada una).
- **Flujo:** una rama por tarjeta (`tipo/NN-descripcion`), pull request a `main` con CI en verde y revisión de alguien de la otra capa, squash merge.
- **Commits:** `tipo(módulo): descripción` con `Refs: #NN, RF-xx`.
- **IA:** Claude Code con las skills de `.claude/skills/`. Hay una por cada tecnología de la cátedra y otras para el ciclo de cada tarjeta (`/tarjeta-nueva`, `/tarjeta-iniciar`, `/tarjeta-commit`, `/tarjeta-entregar`, `/tarjeta-cerrar`).

## 11. Supuestos a confirmar por el grupo

Son decisiones de detalle que tomé para poder escribir el documento. Cualquiera se puede cambiar.

1. Recargo por atraso igual al precio por día por cada día de atraso (`RN-07`).
2. Máximo 30 días por alquiler (`RN-03`).
3. Calificación de 1 a 5 estrellas, sin plazo para calificar (`RF-20`).
4. Carrera elegida de la lista que mantiene el ADMIN (con un seed inicial); el legajo se guarda como texto y el ADMIN lo verifica a mano. Las materias son texto libre en cada herramienta, no una tabla.
5. Un usuario `PENDIENTE` puede navegar y buscar, pero no operar (`RF-04`).
6. React Router para la navegación del frontend, como en el paso 9 de la guía de React de la cátedra.
7. Las fotos se suben en un paso aparte de la publicación: primero se crea la herramienta y después se le agregan fotos.

## 12. Próximos pasos

1. Revisar este documento en grupo y cerrar los supuestos del punto 11.
2. ~~Crear las tarjetas a partir de los `RF`, `RN` y `RNF` y cargarlas en el GitHub Project~~ (issues #3 a #50, [Project «Herramientas Ya»](https://github.com/users/Alanv3514/projects/2)).
3. Primera iteración: estructura del monorepo, Docker Compose, CI, modelo de datos y autenticación.
