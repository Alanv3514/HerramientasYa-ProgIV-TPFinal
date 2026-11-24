# Código de autenticación y permisos

Adaptado de `clase-1-sqlmodel` (`utils/hash.py`, `services/jwt.py`, `api/login.py`, `api/middlewares/`, `dependencies.py`, `api/users.py`, `repositories/seed.py`) y de `jwt-guide.md`.

Contenido:

1. [Contraseñas](#contraseñas)
2. [Configuración desde .env](#configuración-desde-env)
3. [JWTService](#jwtservice)
4. [Login](#login)
5. [@protected y JWTAuthMW](#protected-y-jwtauthmw)
6. [Usuario logueado](#usuario-logueado)
7. [permission_check y usuario_habilitado](#permission_check-y-usuario_habilitado)
8. [Catálogo y seed](#catálogo-y-seed)

## Contraseñas

`utils/hash.py`, igual que en la cátedra:

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

Ojo: passlib 1.7.4 falla con bcrypt 4.1 o más nuevo. La cátedra fija `bcrypt==4.0.1` en `requirements.txt`, y nosotros también.

## Configuración desde .env

`config.py`. La guía de JWT recomienda `pydantic-settings` en lugar de hardcodear la clave:

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    jwt_secret_key: str
    jwt_expire_minutes: int = 30
    cors_origin: str = "http://localhost:5174"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # falla al iniciar si falta JWT_SECRET_KEY: mejor que firmar con una clave vacía
```

`.env.example`:

```
JWT_SECRET_KEY=
JWT_EXPIRE_MINUTES=30
CORS_ORIGIN=http://localhost:5174
```

## JWTService

`services/jwt.py`, sin cambios respecto de la cátedra:

```python
from datetime import datetime, timedelta, timezone

import jwt


class JWTService:
    def __init__(self, secret_key: str, algorithm: str = "HS256", expire_minutes: int = 30):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.expire_minutes = expire_minutes

    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=self.expire_minutes)
        to_encode["exp"] = expire
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def decode_token(self, token: str) -> dict | None:
        try:
            return jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
```

En `dependencies.py`, la única diferencia con la cátedra es de dónde sale la clave:

```python
from config import get_settings


def get_jwt_service():
    settings = get_settings()
    return JWTService(settings.jwt_secret_key, expire_minutes=settings.jwt_expire_minutes)


JWTServiceDep = Annotated[JWTService, Depends(get_jwt_service)]
```

## Login

`services/login.py`:

```python
from dependencies import UsuarioRepositoryDep
from model.usuarios import EstadoUsuario, Usuario
from services.errores import CuentaNoHabilitadaError
from utils.hash import verify_password


class LoginService:
    def __init__(self, repo: UsuarioRepositoryDep):
        self.repo = repo

    def login(self, email: str, pwd: str) -> Usuario | None:
        usuario = self.repo.get_by_email(email)
        if not usuario or not verify_password(pwd, usuario.password_hash):
            return None
        if usuario.estado == EstadoUsuario.SUSPENDIDO:  # RF-02
            raise CuentaNoHabilitadaError("Tu cuenta está suspendida")
        return usuario
```

`api/login.py`:

```python
router = APIRouter(tags=["Auth"])
LoginServiceDep = Annotated[LoginService, Depends(LoginService)]


@router.post("/auth/login", response_model=LoginResponse)
def login(req: Login, service: LoginServiceDep, jwt_service: JWTServiceDep) -> LoginResponse:
    usuario = service.login(req.email, req.password)
    if not usuario:
        # Mismo mensaje para email y contraseña: no le decimos al atacante cuál acertó.
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    return LoginResponse(msg="ok", token=jwt_service.create_access_token({"sub": usuario.email}))
```

`CuentaNoHabilitadaError` se traduce a 403 con el handler de `main.py` (ver `/fastapi-sqlmodel`).

## @protected y JWTAuthMW

Sin cambios respecto de la cátedra.

`api/middlewares/protected.py`:

```python
from collections.abc import Callable
from typing import TypeVar

F = TypeVar("F", bound=Callable)


def protected(func: F) -> F:
    # Marca el endpoint como protegido; JWTAuthMW lo lee para exigir el token.
    func.__protected__ = True  # type: ignore[attr-defined]
    return func
```

`api/middlewares/auth.py`:

```python
from fastapi import HTTPException, Request

from dependencies import get_jwt_service


class JWTAuthMW:
    """Se registra como dependencia global: corre después del ruteo, cuando ya se conoce el endpoint."""

    def __init__(self):
        self.jwt_service = get_jwt_service()

    def _is_protected(self, request: Request) -> bool:
        route = request.scope.get("route")
        return getattr(getattr(route, "endpoint", None), "__protected__", False)

    async def check_jwt(self, request: Request) -> None:
        if not self._is_protected(request):
            return
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Falta el token de acceso")
        payload = self.jwt_service.decode_token(authorization.removeprefix("Bearer "))
        if payload is None:
            raise HTTPException(status_code=401, detail="El token es inválido o venció")
        request.state.jwt_payload = payload
```

`main.py`:

```python
jwtAuthMW = JWTAuthMW()
app = FastAPI(dependencies=[Depends(jwtAuthMW.check_jwt)])
```

`@protected` va **debajo** de `@router.get(...)`. Los decoradores se aplican de abajo hacia arriba: el router tiene que registrar la función ya marcada.

## Usuario logueado

`dependencies.py`, como `get_current_user_id` de la cátedra:

```python
def get_current_user_id(request: Request, repo: UsuarioRepositoryDep) -> int:
    # JWTAuthMW ya validó el token y dejó el payload en request.state.
    payload = getattr(request.state, "jwt_payload", None)
    if payload is None:
        raise HTTPException(status_code=401, detail="Falta el token de acceso")
    usuario = repo.get_by_email(payload["sub"])
    if not usuario or usuario.id is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return usuario.id


CurrentUserIdDep = Annotated[int, Depends(get_current_user_id)]
```

## permission_check y usuario_habilitado

`api/permisos.py`. Es el `permission_check` de `api/users.py` de la cátedra, movido a su propio archivo para que lo usen todos los routers:

```python
from fastapi import HTTPException

from dependencies import CurrentUserIdDep, UsuarioServiceDep
from model.usuarios import EstadoUsuario


def permission_check(p: str):
    def check(service: UsuarioServiceDep, me_id: CurrentUserIdDep):
        # obtenemos el usuario logueado
        me = service.get_usuario_by_id(me_id)
        if not me:
            raise HTTPException(status_code=401, detail="Usuario no logueado")
        # chequeamos el permiso en cualquiera de sus roles
        if not any(permiso.name == p for rol in me.roles for permiso in rol.permissions):
            raise HTTPException(status_code=403, detail=f"No tenés permiso para esta acción ({p})")

    return check


def usuario_habilitado(service: UsuarioServiceDep, me_id: CurrentUserIdDep):
    # RN-10: un PENDIENTE o SUSPENDIDO no publica ni alquila.
    me = service.get_usuario_by_id(me_id)
    if not me or me.estado != EstadoUsuario.VALIDADO:
        raise HTTPException(status_code=403, detail="Tu cuenta todavía no fue validada por un administrador")
```

Uso:

```python
@router.post("/alquileres", response_model=CreateAlquilerResponse, status_code=201,
             dependencies=[*bearer, Depends(permission_check(P.SOLICITAR_ALQUILERES)), Depends(usuario_habilitado)])
@protected
def solicitar(req: SolicitarAlquilerRequest, service: AlquilerServiceDep, me_id: CurrentUserIdDep) -> Alquiler:
    ...
```

## Catálogo y seed

`model/permisos.py`:

```python
# Catálogo único de permisos: el router y el seed usan estas constantes, nunca strings sueltos.
VER_USUARIOS = "ver_usuarios"
VALIDAR_USUARIOS = "validar_usuarios"
GESTIONAR_CATEGORIAS = "gestionar_categorias"
GESTIONAR_CARRERAS = "gestionar_carreras"
MODERAR_HERRAMIENTAS = "moderar_herramientas"
PUBLICAR_HERRAMIENTAS = "publicar_herramientas"
GESTIONAR_SOLICITUDES = "gestionar_solicitudes"
SOLICITAR_ALQUILERES = "solicitar_alquileres"
CALIFICAR = "calificar"

ADMIN = "ADMIN"
PROPIETARIO = "PROPIETARIO"
CLIENTE = "CLIENTE"

ROL_PERMISOS = {
    ADMIN: [VER_USUARIOS, VALIDAR_USUARIOS, GESTIONAR_CATEGORIAS, GESTIONAR_CARRERAS, MODERAR_HERRAMIENTAS],
    PROPIETARIO: [PUBLICAR_HERRAMIENTAS, GESTIONAR_SOLICITUDES, CALIFICAR],
    CLIENTE: [SOLICITAR_ALQUILERES, CALIFICAR],
}
```

En los routers: `import model.permisos as P` y `permission_check(P.PUBLICAR_HERRAMIENTAS)`.

`repositories/seed.py`, en el estilo de `seed_roles_and_permissions` de la cátedra:

```python
from sqlmodel import Session, select

from model.permisos import ROL_PERMISOS
from model.roles import Permission, Role


def seed_roles_y_permisos(session: Session) -> None:
    # Idempotente: crea solo lo que falta, así sumar un permiso no requiere borrar la base.
    existentes = {p.name: p for p in session.exec(select(Permission)).all()}
    for nombre in {p for permisos in ROL_PERMISOS.values() for p in permisos}:
        if nombre not in existentes:
            existentes[nombre] = Permission(name=nombre)
            session.add(existentes[nombre])

    roles = {r.name: r for r in session.exec(select(Role)).all()}
    for rol, permisos in ROL_PERMISOS.items():
        role = roles.get(rol) or Role(name=rol)
        role.permissions = [existentes[p] for p in permisos]
        session.add(role)
    session.commit()
```

El primer ADMIN se crea en el seed de datos de demo. `RF-03` no deja que un usuario se asigne ADMIN a sí mismo.
