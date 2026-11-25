from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Antes de importar la base: database.py lee DB_ENGINE y DATABASE_URL con os.getenv al importarse.
# load_dotenv() busca el .env hacia arriba, así que encuentra el de la raíz del repo.
load_dotenv()

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from api import health  # noqa: E402
from config import get_settings  # noqa: E402
from repositories.database import create_db_and_tables  # noqa: E402
from services.errores import (  # noqa: E402
    ConflictoError,
    CuentaNoHabilitadaError,
    ErrorDeDominio,
    NoEsDuenioError,
    ReglaDeNegocioError,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al iniciar crea las tablas que falten. Los tests usan TestClient(app) sin `with`, así que no corre.
    create_db_and_tables()
    yield


settings = get_settings()  # si falta JWT_SECRET_KEY, la API no arranca (RNF-02)
app = FastAPI(title="Herramientas Ya", lifespan=lifespan)

# RNF-05: solo el frontend puede llamar a la API desde el navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cada error del dominio se traduce a su código HTTP, con el formato {"detail": "..."} de FastAPI.
CODIGOS: dict[type[ErrorDeDominio], int] = {
    ReglaDeNegocioError: 400,
    NoEsDuenioError: 403,
    CuentaNoHabilitadaError: 403,
    ConflictoError: 409,
}

for clase, codigo in CODIGOS.items():
    # El default congela el código de cada vuelta del for.
    async def handler(request: Request, exc: Exception, codigo: int = codigo) -> JSONResponse:
        return JSONResponse(status_code=codigo, content={"detail": str(exc)})

    app.add_exception_handler(clase, handler)

app.include_router(health.router)
