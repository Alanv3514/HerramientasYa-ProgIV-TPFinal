import pytest
from fastapi.testclient import TestClient

from main import app
from services.errores import ConflictoError, CuentaNoHabilitadaError, NoEsDuenioError, ReglaDeNegocioError


# Ruta solo de prueba: lanza el error que se le pida, como lo haría un servicio.
@app.get("/_test/error/{nombre}", include_in_schema=False)
def lanzar_error(nombre: str):
    clases = {
        "regla": ReglaDeNegocioError,
        "duenio": NoEsDuenioError,
        "cuenta": CuentaNoHabilitadaError,
        "conflicto": ConflictoError,
    }
    raise clases[nombre]("Mensaje para el usuario")


@pytest.mark.parametrize(
    "nombre, codigo",
    [("regla", 400), ("duenio", 403), ("cuenta", 403), ("conflicto", 409)],
)
def test_error_del_dominio_se_traduce_a_su_codigo(client: TestClient, nombre: str, codigo: int):
    response = client.get(f"/_test/error/{nombre}")

    assert response.status_code == codigo
    assert response.json() == {"detail": "Mensaje para el usuario"}
