# Herramientas Ya

Sistema de alquiler de herramientas para prácticas de estudiantes. Proyecto final de Programación IV (UTN TUP 2026). Lo desarrollan cuatro personas y en la mesa cada una defiende su parte: el código tiene que poder explicarse línea por línea.

## Arquitectura

Monorepo:

| Carpeta | Qué hay | Cómo se escribe |
| --- | --- | --- |
| `backend/` | FastAPI + SQLModel, en capas: `model/`, `repositories/`, `services/`, `api/` (routers y `api/model/`), `dependencies.py`, `tests/` | Skill `/fastapi-sqlmodel` |
| `frontend/` | React + TypeScript + Vite: `api/`, `context/`, `hooks/`, `components/`, `pages/` | Skill `/react-frontend` |
| `docs/` | Propuesta, requisitos y la guía del tablero | — |
| `docker-compose.yml` | `db` (PostgreSQL), `api` y `web` | Skill `/postgresql-docker` |

Seguimos la forma en que la cátedra enseñó cada tecnología. Cada una tiene su skill en `.claude/skills/`, armada a partir del material del profe:

| Tecnología | Skill | Material de la cátedra |
| --- | --- | --- |
| FastAPI + SQLModel en capas | `/fastapi-sqlmodel` | API `clase-1-sqlmodel` |
| Relaciones 1-N y N-N | `/sqlmodel-relaciones` | `guia-nn-group-membership.md` |
| JWT, roles y permisos | `/jwt-permisos` | `jwt-guide.md` y `permission_check` |
| Tests con pytest | `/pytest-api` | `testing-guide.md` |
| PostgreSQL y Docker | `/postgresql-docker` | `postgresql-guide.md` |
| React consumiendo la API | `/react-frontend` | `guia-react-frontend.pdf` (pasos 0 a 13) |

## Comandos

Se completan con las tarjetas de estructura (iteración 1). Hasta entonces son los previstos:

- Todo junto: `docker compose up --build`.
- Backend (desde `backend/`, con el `.venv` activo): `uvicorn main:app --reload`.
- Tests: `pytest --cov=services --cov=api --cov=repositories --cov-report=term-missing`.
- Lint backend: `ruff check .`.
- Frontend (desde `frontend/`): `npm run dev`, `npm run lint` (oxlint) y `npm run build` (incluye el typecheck).

## Fuente de verdad del negocio

- La propuesta aprobada está en `docs/propuesta.txt` y el detalle en `docs/requisitos.md`: `RF-xx` (funcionales), `RN-xx` (reglas de negocio) y `RNF-xx` (no funcionales).
- Antes de implementar, leé las secciones que referencia la tarjeta.
- Si el código contradice los requisitos, mandan los requisitos.
- Si un requisito es ambiguo o no cubre un caso, preguntá. Nunca inventes una regla de negocio.

## Gestión del trabajo

- Tablero: GitHub Project "Herramientas Ya" del usuario Alanv3514. Cada tarjeta es un issue (`#NN`).
- Columnas: 📌 Cómo trabajamos → Backlog → Para hacer → En curso (máx. 2 por persona) → En revisión → Hecho.
- La guía completa está en `docs/gestion/como-trabajamos.md` y en el issue fijado «📌 Cómo trabajamos — leer antes de tomar una tarjeta».
- Todo trabajo corresponde a una tarjeta. Si durante una tarea aparece algo fuera de su alcance (un bug, una mejora, deuda técnica), no lo implementes: anotalo al final de tu respuesta como «Posible tarjeta nueva», con título y motivo.
- `scripts/tablero.mjs` lee y mueve tarjetas con `gh`. Cada persona corre una vez `gh auth refresh -s project`.

## Git

- `main` es la única rama fija y está protegida: nadie (ni el admin) commitea ni pushea directo en ella. Solo recibe pull requests de otras ramas, con 1 aprobación, conversaciones resueltas e historial lineal; no se permite force push ni borrarla.
- Única excepción: los pull requests de las tarjetas de estructura #4 a #8 (la #3 va en el mismo PR que la #4) los integra Alan sin aprobación, con `enforce_admins` desactivado. La #8 lo vuelve a activar. Ver la regla 2 de `docs/gestion/como-trabajamos.md`.
- Toda funcionalidad nueva se desarrolla en una rama nueva. Al integrar el pull request, GitHub borra la rama remota automáticamente; la local la limpia `/tarjeta-cerrar`.
- Una rama por tarjeta, que sale de `main`: `tipo/NN-descripcion-corta` (tipos: feat, fix, refactor, test, docs, chore).
- Conventional Commits: `tipo(módulo): descripción en presente`, con `Refs: #NN, RF-xx` en el cuerpo.
- Un commit, una intención. No mezcles reformateo con cambios de lógica.
- Integración por pull request con squash merge, CI en verde y la revisión de un compañero de la otra capa (backend revisa frontend y al revés).
- Sin coautoría de la IA: los commits y los pull requests no llevan líneas `Co-Authored-By` ni firmas de herramientas. El autor es quien entrega la tarjeta.
- Nunca hagas commit ni push sin mostrar antes el resumen del cambio y recibir confirmación.

## Reglas técnicas no negociables

- Toda ruta protegida lleva `@protected` y declara su permiso con `permission_check("...")`. Las únicas públicas son registro, login, catálogo, detalle, carreras y categorías (lectura).
- Además del permiso, el servicio verifica la propiedad del recurso (`RNF-03`): un propietario solo opera sus herramientas y un cliente solo sus alquileres. Si no es el dueño, 403.
- Las reglas de negocio (`RN-xx`) van en `services/`, en funciones puras con su test. Los routers no llevan reglas.
- Los montos son `Decimal`, nunca `float`.
- La clave del JWT y las credenciales de la base van en `.env`, que no se sube. Hay un `.env.example`.
- Nunca registres contraseñas en logs ni las devuelvas en una respuesta.
- En el frontend, `apiFetch` (en `api/client.ts`) es el único lugar con `fetch`. Ocultar un botón es experiencia de usuario, no seguridad: el control real lo hace la API.

## Estilo de código

- Python: 4 espacios, líneas de hasta 120, `ruff` con las reglas de la cátedra (`E`, `F`, `I`).
- TypeScript: 2 espacios, sin punto y coma, comillas simples, como el repo de la cátedra.
- Nombres del dominio en español (`herramienta`, `alquiler`, `precio_dia`). Lo técnico, como lo dio la cátedra (`Repository`, `Service`, `Request`, `Response`).
- Comentarios en español, cortos, que expliquen el porqué, con la referencia al requisito cuando aplica (`# RN-04`).
- Mensajes de error de la API en español: los lee el usuario final (`RNF-10`).

## Definición de Hecho

Una tarjeta está terminada cuando:

1. Cumple todos sus criterios de aceptación.
2. Tiene tests (pytest en el backend) y pasa toda la suite, incluido el test de humo `tests/api/test_humo.py`, junto con el lint y el build.
3. `docs/` está actualizado si cambió una ruta, una regla o cómo se levanta el sistema.
4. Pasó la prueba de integración antes del PR: rebasada sobre `main`, levantada con `docker compose up` y con el flujo principal recorrido (regla 5 de `docs/gestion/como-trabajamos.md`).
5. Quien la hizo puede explicar el código en la defensa.

## Flujo de trabajo con skills

- `/tarjeta-nueva`: crea una tarjeta a partir de la plantilla y la suma al Backlog.
- `/tarjeta-iniciar NN`: valida la tarjeta y sus dependencias, crea la rama y propone un plan.
- `/tarjeta-commit`: revisa el diff y propone el commit.
- `/tarjeta-entregar`: verifica la Definición de Hecho, abre el pull request y pasa la tarjeta a En revisión.
- `/tarjeta-cerrar NN`: después del merge, limpia la rama, registra el tiempo real y sugiere la siguiente.
