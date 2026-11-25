# Backend

API de Herramientas Ya con FastAPI y SQLModel, en capas, como la API `clase-1-sqlmodel` de la cátedra.

| Carpeta | Qué va |
| --- | --- |
| `model/` | Tablas de SQLModel |
| `repositories/` | Acceso a datos y conexión a la base (`database.py`) |
| `services/` | Reglas de negocio (`RN-xx`), en funciones puras con su test |
| `api/` | Routers, y en `api/model/` los `Request` y `Response` |
| `tests/` | pytest con SQLite en memoria |

- **Cómo se escribe:** skills `/fastapi-sqlmodel`, `/sqlmodel-relaciones`, `/jwt-permisos` y `/pytest-api`.
- **Variables:** se leen del `.env` de la raíz del repo (ver `.env.example`).
- **Cómo se levanta:** se completa en la tarjeta #4.
