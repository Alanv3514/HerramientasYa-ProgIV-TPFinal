import os

# Antes de importar main: los tests nunca usan el .env real ni la base real.
# load_dotenv() no pisa variables que ya existen, así que estas mandan.
os.environ["DB_ENGINE"] = "sqlite"
os.environ["SQLITE_FILE"] = ":memory:"
os.environ["JWT_SECRET_KEY"] = "clave-solo-para-tests"
os.environ["CORS_ORIGIN"] = "http://localhost:5174"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    # Sin `with`: no corre el lifespan, que crearía las tablas (ver /pytest-api).
    # La tarjeta #14 suma acá la sesión en memoria, el seed y los headers por rol.
    return TestClient(app)
