# Ejemplos de tests

## conftest.py

El de la cátedra, con un usuario por rol de Herramientas Ya. Todos usan la contraseña `123456789`, porque `RF-01` pide 8 caracteres como mínimo.

```python
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from model.usuarios import EstadoUsuario, Usuario
from repositories.database import get_session
from repositories.seed import asignar_rol, seed_carreras, seed_roles_y_permisos
from utils.hash import hash_password

PASSWORD = "123456789"


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",                               # en memoria
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,                      # todas las conexiones ven la misma base
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(name="seed")
def seed_fixture(session: Session):
    seed_roles_y_permisos(session)
    seed_carreras(session)
    pwd = hash_password(PASSWORD)       # las contraseñas se guardan hasheadas
    usuarios = [
        # (email, roles, estado)
        ("admin@email.com", ["ADMIN"], EstadoUsuario.VALIDADO),
        ("prop@email.com", ["PROPIETARIO"], EstadoUsuario.VALIDADO),
        ("prop2@email.com", ["PROPIETARIO"], EstadoUsuario.VALIDADO),   # para los 403 de propiedad
        ("cliente@email.com", ["CLIENTE"], EstadoUsuario.VALIDADO),
        ("pendiente@email.com", ["CLIENTE"], EstadoUsuario.PENDIENTE),  # para RN-10
    ]
    for email, roles, estado in usuarios:
        usuario = Usuario(nombre=email.split("@")[0], apellido="Test", email=email, password_hash=pwd,
                          telefono="1100000000", carrera_id=1, legajo="12345", estado=estado)
        session.add(usuario)
        session.commit()
        for rol in roles:
            asignar_rol(session, usuario, rol)


def _login(client: TestClient, email: str) -> dict[str, str]:
    res = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture(name="admin")
def admin_fixture(client, seed):
    return _login(client, "admin@email.com")


@pytest.fixture(name="propietario")
def propietario_fixture(client, seed):
    return _login(client, "prop@email.com")


@pytest.fixture(name="otro_propietario")
def otro_propietario_fixture(client, seed):
    return _login(client, "prop2@email.com")


@pytest.fixture(name="cliente")
def cliente_fixture(client, seed):
    return _login(client, "cliente@email.com")


@pytest.fixture(name="pendiente")
def pendiente_fixture(client, seed):
    return _login(client, "pendiente@email.com")
```

Las fixtures de datos (una herramienta publicada, un alquiler confirmado) van en el archivo de test que las usa. Si las comparten varios archivos, en `conftest.py`, como `group_id` en la guía N-N:

```python
@pytest.fixture(name="herramienta_id")
def herramienta_id_fixture(client, propietario) -> int:
    body = {"nombre": "Multímetro", "descripcion": "Digital", "categoria_id": 1, "carrera_ids": [1],
            "conservacion": "BUENA", "precio_dia": "1500.00", "deposito": "5000.00"}
    return client.post("/herramientas", json=body, headers=propietario).json()["id"]
```

## Integración: un endpoint con todos sus casos

```python
# tests/api/test_alquileres.py
from datetime import date, timedelta

import pytest

HOY = date.today()


def _solicitud(herramienta_id: int, desde: int, hasta: int) -> dict:
    return {"herramienta_id": herramienta_id,
            "fecha_inicio": str(HOY + timedelta(days=desde)),
            "fecha_fin": str(HOY + timedelta(days=hasta))}


def test_solicitar_ok(client, cliente, herramienta_id):
    res = client.post("/alquileres", json=_solicitud(herramienta_id, 1, 3), headers=cliente)
    assert res.status_code == 201
    alquiler = client.get(f"/alquileres/{res.json()['id']}", headers=cliente).json()
    assert alquiler["estado"] == "SOLICITADO"
    assert alquiler["dias"] == 3
    assert alquiler["costo"] == "4500.00"        # RN-05: 3 días × 1500


def test_solicitar_propia_herramienta_400(client, propietario, herramienta_id):
    # RN-01. Además, PROPIETARIO no tiene solicitar_alquileres: si el usuario
    # tuviera los dos roles, la regla la frena el servicio.
    res = client.post("/alquileres", json=_solicitud(herramienta_id, 1, 3), headers=propietario)
    assert res.status_code in (400, 403)


def test_solicitar_usuario_pendiente_403(client, pendiente, herramienta_id):
    res = client.post("/alquileres", json=_solicitud(herramienta_id, 1, 3), headers=pendiente)
    assert res.status_code == 403                 # RN-10


def test_solicitar_superpuesto_con_confirmado_409(client, cliente, propietario, herramienta_id):
    primero = client.post("/alquileres", json=_solicitud(herramienta_id, 1, 3), headers=cliente).json()
    client.post(f"/alquileres/{primero['id']}/confirmar", headers=propietario)
    res = client.post("/alquileres", json=_solicitud(herramienta_id, 3, 5), headers=cliente)
    assert res.status_code == 409                 # RN-04: el día 3 se comparte


def test_confirmar_herramienta_ajena_403(client, cliente, otro_propietario, herramienta_id):
    alquiler = client.post("/alquileres", json=_solicitud(herramienta_id, 1, 3), headers=cliente).json()
    res = client.post(f"/alquileres/{alquiler['id']}/confirmar", headers=otro_propietario)
    assert res.status_code == 403                 # RNF-03


@pytest.mark.parametrize(
    "method, path",
    [
        ("post", "/alquileres"),
        ("get", "/alquileres"),
        ("post", "/alquileres/1/confirmar"),
        ("post", "/alquileres/1/cancelar"),
    ],
)
def test_rutas_protegidas(client, method, path):
    res = getattr(client, method)(path)
    assert res.status_code == 401
```

## Unitario: una regla pura

```python
# tests/services/test_reglas_alquileres.py
from datetime import date
from decimal import Decimal

import pytest

from services.reglas_alquileres import calcular_costo, calcular_recargo, se_superponen

D = date.fromisoformat


@pytest.mark.parametrize(
    "a, b, esperado",
    [
        ((D("2026-12-01"), D("2026-12-03")), (D("2026-12-03"), D("2026-12-05")), True),   # se tocan: inclusivas
        ((D("2026-12-01"), D("2026-12-03")), (D("2026-12-04"), D("2026-12-05")), False),  # consecutivas
        ((D("2026-12-01"), D("2026-12-10")), (D("2026-12-04"), D("2026-12-05")), True),   # una dentro de otra
        ((D("2026-12-05"), D("2026-12-05")), (D("2026-12-05"), D("2026-12-05")), True),   # mismo día
    ],
)
def test_se_superponen(a, b, esperado):
    assert se_superponen(a, b) is esperado        # RN-04


def test_costo_por_dias_inclusivos():
    dias, costo = calcular_costo(D("2026-12-01"), D("2026-12-03"), Decimal("1500.00"))
    assert dias == 3                              # RN-05: fin − inicio + 1
    assert costo == Decimal("4500.00")


def test_recargo_mayor_que_deposito_genera_deuda():
    r = calcular_recargo(fecha_fin=D("2026-12-03"), devolucion=D("2026-12-08"),
                         precio_dia=Decimal("1500.00"), deposito=Decimal("5000.00"))
    assert r.dias_atraso == 5
    assert r.recargo == Decimal("7500.00")        # RN-07
    assert r.deposito_devuelto == Decimal("0.00")
    assert r.deuda == Decimal("2500.00")
```

## Token vencido

Es el ejercicio 3 de la guía:

```python
from config import get_settings
from services.jwt import JWTService


def test_token_vencido_401(client, seed):
    # Misma clave que usa la app: así falla por el vencimiento y no por la firma.
    clave = get_settings().jwt_secret_key
    token = JWTService(clave, expire_minutes=-1).create_access_token({"sub": "cliente@email.com"})
    res = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
```

En el CI, `JWT_SECRET_KEY` se define como variable de entorno del job, con un valor de prueba.
