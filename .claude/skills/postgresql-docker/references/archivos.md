# Archivos de base de datos e infraestructura

## repositories/database.py

Es el código de `postgresql-guide.md` de la cátedra, sin cambios:

```python
import os

from sqlmodel import Session, SQLModel, create_engine

# DB_ENGINE selecciona la base al iniciar: "sqlite" (por defecto) o "postgresql".
DB_ENGINE = os.getenv("DB_ENGINE", "sqlite").lower()

if DB_ENGINE == "sqlite":
    sqlite_file_name = os.getenv("SQLITE_FILE", "database.db")
    database_url = f"sqlite:///{sqlite_file_name}"
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
elif DB_ENGINE in ("postgresql", "postgres"):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DB_ENGINE=postgresql requires DATABASE_URL to be set")
    engine = create_engine(database_url, pool_pre_ping=True)
else:
    raise RuntimeError(f"Unsupported DB_ENGINE: {DB_ENGINE!r} (use 'sqlite' or 'postgresql')")


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
```

`main.py` llama a `load_dotenv()` antes de importar `repositories.database`, como en la cátedra. Si no, `os.getenv` no ve las variables del `.env` cuando se corre sin Docker.

## .env.example (raíz del repo)

```
# Base de datos
POSTGRES_USER=herramientas
POSTGRES_PASSWORD=cambiame
POSTGRES_DB=herramientas
DB_ENGINE=postgresql
DATABASE_URL=postgresql+psycopg://herramientas:cambiame@db:5432/herramientas

# Autenticación (RNF-02)
JWT_SECRET_KEY=
JWT_EXPIRE_MINUTES=30

# Frontend
CORS_ORIGIN=http://localhost:5174
VITE_API_URL=http://localhost:8000

# Datos de prueba para la demo
SEED_DEMO=true
```

Para correr el backend fuera de Docker contra el Postgres del compose, cambiá `@db:5432` por `@localhost:5432`.

## docker-compose.yml

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      retries: 10

  api:
    build: ./backend
    env_file: .env
    ports:
      - "8000:8000"
    volumes:
      - fotos:/app/fotos
    depends_on:
      db:
        condition: service_healthy   # sin esto, la API arranca antes que Postgres

  web:
    build:
      context: ./frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
    ports:
      - "5174:80"
    depends_on:
      - api

volumes:
  pgdata:
  fotos:
```

## backend/Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## frontend/Dockerfile

Vite inserta `VITE_API_URL` en el momento del build. Por eso es un argumento de build y no una variable de entorno en ejecución.

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# React Router: cualquier ruta devuelve index.html
RUN printf 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri /index.html; } }' \
    > /etc/nginx/conf.d/default.conf
```

## .dockerignore

`backend/.dockerignore`:

```
.venv
__pycache__
.env
*.db
```

`frontend/.dockerignore`:

```
node_modules
dist
.env*
```
