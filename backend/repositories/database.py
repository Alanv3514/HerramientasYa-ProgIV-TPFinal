import os

from sqlmodel import Session, SQLModel, create_engine

from model import usuarios  # noqa: F401  # Registra las tablas antes de create_all.
from repositories.seed import seed_roles_y_permisos

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
    with Session(engine) as session:
        seed_roles_y_permisos(session)


def get_session():
    with Session(engine) as session:
        yield session
