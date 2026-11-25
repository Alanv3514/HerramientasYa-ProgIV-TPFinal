---
name: postgresql-docker
description: Cómo conectar el backend de Herramientas Ya a PostgreSQL y levantar todo con Docker Compose, siguiendo postgresql-guide.md de la cátedra (DB_ENGINE y DATABASE_URL, driver psycopg, create_all al iniciar, tests siempre con SQLite en memoria). Usala cuando haya que tocar repositories/database.py, variables de entorno, el docker-compose.yml, los Dockerfile, el volumen de fotos, el seed de demo, o cuando algo "no conecta a la base" o "no levanta".
---

# PostgreSQL y Docker, como en la cátedra

La guía de PostgreSQL de la cátedra no cambia código para pasar de SQLite a Postgres: lo decide una variable de entorno al iniciar. Nosotros usamos lo mismo, con Docker Compose para que en la mesa un solo comando levante todo.

| Variable | Valores | Por defecto | Para qué |
| --- | --- | --- | --- |
| `DB_ENGINE` | `sqlite` o `postgresql` | `sqlite` | Elige la base al iniciar |
| `SQLITE_FILE` | ruta | `database.db` | Solo con SQLite |
| `DATABASE_URL` | `postgresql+psycopg://usuario:clave@host:5432/base` | — | Obligatoria con Postgres |

El `repositories/database.py`, el `docker-compose.yml` y los Dockerfile completos están en [references/archivos.md](references/archivos.md).

## Cómo se usa cada base

| Dónde | Base | Por qué |
| --- | --- | --- |
| Tests (`pytest`, local y CI) | SQLite en memoria, por `conftest.py` | Rápidos y aislados; no dependen de Docker |
| Desarrollo rápido del backend | SQLite (`DB_ENGINE=sqlite`) o el Postgres del compose | A elección; lo que importa es probar en Postgres antes de entregar |
| `docker compose up` (demo y mesa) | PostgreSQL 16 | Lo que pide `docs/requisitos.md` |

Como los tests corren en SQLite y la demo en Postgres, cualquier SQL particular de un motor rompe en el otro. Usá siempre el `select` de SQLModel, nunca SQL a mano.

## Pasos

1. **`repositories/database.py`**: igual al de la guía. Falla al iniciar si `DB_ENGINE` es desconocido o si falta `DATABASE_URL`.
2. **Driver**: `psycopg[binary]` en `requirements.txt`. La URL lleva el esquema `postgresql+psycopg://`.
3. **Compose**: tres servicios.
   - `db`: `postgres:16` con un volumen `pgdata` y un `healthcheck`.
   - `api`: el backend, que depende de `db` sano y monta el volumen `fotos`.
   - `web`: el frontend.
   - Las credenciales salen de `.env` (hay un `.env.example`).
4. **Tablas**: `create_all` al iniciar, como en la cátedra. Solo crea las tablas que faltan, no modifica las que existen. Si una tarjeta cambia columnas de una tabla existente, avisalo en el PR: en desarrollo se recrea con `docker compose down -v`. Si el grupo decide sumar Alembic, va en una tarjeta propia.
5. **Seed**: los roles, los permisos y las carreras se crean siempre al iniciar (idempotente). Los datos de demo (usuarios de prueba, herramientas, alquileres) solo si `SEED_DEMO=true`.
6. **Verificar**:
   - `docker compose up --build`;
   - `docker compose exec db psql -U herramientas -d herramientas -c '\dt'` muestra las tablas;
   - `http://localhost:8000/docs` responde y el frontend abre en `http://localhost:5174`.

## Reglas

- `DATABASE_URL`, `POSTGRES_PASSWORD` y `JWT_SECRET_KEY` nunca van al repo. `.env` está en `.gitignore`; `.env.example` lleva los nombres con valores de ejemplo.
- Si la clave tiene caracteres especiales, en la URL van codificados (`@` → `%40`), como dice la guía.
- El puerto del frontend (5174, el de la cátedra) tiene que coincidir con `CORS_ORIGIN` de la API.
- Las fotos se guardan en el volumen `fotos` montado en la API, no en la base. La base guarda solo el nombre de archivo generado (`RNF-04`).

## Errores frecuentes

| Síntoma | Causa |
| --- | --- |
| `DB_ENGINE=postgresql requires DATABASE_URL` | Falta la variable en `.env` o en el `environment` del servicio |
| `connection refused` al iniciar la API | La API arrancó antes que Postgres: falta `depends_on` con `condition: service_healthy` |
| `password authentication failed` | El volumen `pgdata` se creó con otra clave. `docker compose down -v` borra el volumen y lo recrea |
| Una columna nueva no aparece | `create_all` no altera tablas existentes: recreá el volumen |
| `blocked by CORS policy` | `CORS_ORIGIN` no coincide con la URL del frontend, o la API tiró un 500 (mirá `docker compose logs api`) |
| `Port 5432 is already in use` | Hay otro Postgres local. Cambiá el puerto publicado (`"5433:5432"`) |
