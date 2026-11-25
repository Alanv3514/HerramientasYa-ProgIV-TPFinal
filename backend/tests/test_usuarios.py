import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine, select

from main import app
from model import permisos as P
from model.roles import Permission, Role, RolPermiso
from model.usuarios import EstadoUsuario, Usuario
from repositories import database


@pytest.fixture
def motor(monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    monkeypatch.setattr(database, "engine", engine)
    yield engine
    engine.dispose()


def test_arrancar_dos_veces_conserva_el_catalogo(motor):
    esperado = {
        P.ADMIN: {P.VER_USUARIOS, P.VALIDAR_USUARIOS, P.GESTIONAR_CATEGORIAS, P.GESTIONAR_CARRERAS,
                  P.MODERAR_HERRAMIENTAS},
        P.PROPIETARIO: {P.PUBLICAR_HERRAMIENTAS, P.GESTIONAR_SOLICITUDES, P.CALIFICAR},
        P.CLIENTE: {P.SOLICITAR_ALQUILERES, P.CALIFICAR},
    }
    instantaneas = []
    for _ in range(2):
        with TestClient(app), Session(motor) as sesion:
            roles = sesion.exec(select(Role)).all()
            permisos = sesion.exec(select(Permission)).all()
            assert {rol.name: {p.name for p in rol.permissions} for rol in roles} == esperado
            assert {p.name for p in permisos} == set.union(*esperado.values())
            vinculos = sesion.exec(select(RolPermiso)).all()
            assert len(vinculos) == sum(len(grupo) for grupo in esperado.values())
            instantaneas.append(({r.name: r.id for r in roles}, {p.name: p.id for p in permisos}))
    assert instantaneas[0] == instantaneas[1]


def test_usuario_con_dos_roles_y_email_unico(motor):
    database.create_db_and_tables()
    datos = dict(nombre="Ana", apellido="Paz", email="ana@example.org", password_hash="hash-de-prueba",
                 telefono="12345678", carrera_id=1, legajo="00123")
    with Session(motor) as sesion:
        usuario = Usuario(**datos)
        usuario.roles = list(sesion.exec(select(Role).where(Role.name != P.ADMIN)).all())
        sesion.add(usuario)
        sesion.commit()
        sesion.refresh(usuario)
        assert usuario.estado == EstadoUsuario.PENDIENTE
        assert usuario.creado_en is not None
        assert usuario.legajo == "00123"
        assert {r.name for r in usuario.roles} == {P.CLIENTE, P.PROPIETARIO}
        assert all(usuario in rol.usuarios for rol in usuario.roles)
        sesion.add(Usuario(**datos))
        with pytest.raises(IntegrityError):
            sesion.commit()
