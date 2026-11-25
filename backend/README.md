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

## Cómo se levanta

Con Python 3.12, desde `backend/`:

```bash
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

Sin Python instalado, [uv](https://docs.astral.sh/uv/) lo baja solo para el proyecto: `uv venv --python 3.12` y `uv pip install -r requirements.txt`.

Copiá `.env.example` (en la raíz del repo) como `.env` y completá `JWT_SECRET_KEY`. Para desarrollar sin Docker, poné `DB_ENGINE=sqlite`. Después:

```bash
uvicorn main:app --reload       # http://localhost:8000/docs
pytest --cov=services --cov=api --cov=repositories --cov-report=term-missing
ruff check .
```

`GET /health` responde `{"status": "ok"}` cuando la API está arriba.
