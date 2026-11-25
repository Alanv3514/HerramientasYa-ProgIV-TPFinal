# Un recurso completo, capa por capa

Ejemplo: categorías (`RF-06`). Sigue el estilo de `users` y `roles` de la API `clase-1-sqlmodel` de la cátedra. Para otro recurso se copia la estructura y se cambian nombres, campos y permisos.

Contenido:

1. [Modelo](#1-modelo)
2. [Repositorio](#2-repositorio)
3. [Servicio](#3-servicio)
4. [Dependencias](#4-dependencias)
5. [Modelos de API](#5-modelos-de-api)
6. [Router](#6-router)
7. [main.py y seed](#7-mainpy-y-seed)
8. [Errores del dominio](#errores-del-dominio)
9. [Propiedad del recurso](#propiedad-del-recurso)

## 1. Modelo

`model/categorias.py`

```python
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from model.herramientas import Herramienta


# Nivel de negocio
class CategoriaBase(SQLModel):
    nombre: str = Field(unique=True, index=True, max_length=60)
    descripcion: str | None = None


# Nivel de base de datos
class Categoria(CategoriaBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    herramientas: list["Herramienta"] = Relationship(back_populates="categoria")
```

- `TYPE_CHECKING` evita el import circular, igual que `model/roles.py` de la cátedra.
- Chequeo rápido: `python -c "import main"`.

## 2. Repositorio

`repositories/categorias.py`

```python
from collections.abc import Sequence
from typing import Annotated

from fastapi import Query
from sqlmodel import col, func, select

from dependencies import SessionDep
from model.categorias import Categoria, CategoriaBase
from model.herramientas import Herramienta


class CategoriaRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def fetch_categorias(self, offset: int = 0, limit: Annotated[int, Query(le=100)] = 20) -> Sequence[Categoria]:
        statement = select(Categoria).order_by(Categoria.nombre).offset(offset).limit(limit)
        return self.session.exec(statement).all()

    def get_by_id(self, categoria_id: int) -> Categoria | None:
        return self.session.get(Categoria, categoria_id)

    def get_by_nombre(self, nombre: str) -> Categoria | None:
        statement = select(Categoria).where(col(Categoria.nombre) == nombre)
        return self.session.exec(statement).first()

    def contar_herramientas(self, categoria_id: int) -> int:
        # El conteo lo hace la base, no Python (RNF-08).
        statement = select(func.count()).select_from(Herramienta).where(Herramienta.categoria_id == categoria_id)
        return self.session.exec(statement).one()

    def create_categoria(self, base: CategoriaBase) -> Categoria:
        categoria = Categoria(nombre=base.nombre, descripcion=base.descripcion)
        self.session.add(categoria)
        self.session.commit()
        self.session.refresh(categoria)
        return categoria

    def update_categoria(self, categoria: Categoria, base: CategoriaBase) -> Categoria:
        categoria.nombre = base.nombre
        categoria.descripcion = base.descripcion
        self.session.add(categoria)
        self.session.commit()
        self.session.refresh(categoria)
        return categoria

    def delete_categoria(self, categoria: Categoria):
        self.session.delete(categoria)
        self.session.commit()
```

## 3. Servicio

`services/categorias.py`

```python
from abc import ABC, abstractmethod
from collections.abc import Sequence

from dependencies import CategoriaRepositoryDep
from model.categorias import Categoria, CategoriaBase
from services.errores import ConflictoError, ReglaDeNegocioError


class CategoriaServiceInterface(ABC):
    @abstractmethod
    def get_categorias(self, offset: int, limit: int) -> Sequence[Categoria]: ...

    @abstractmethod
    def get_categoria_by_id(self, categoria_id: int) -> Categoria | None: ...

    @abstractmethod
    def create_categoria(self, base: CategoriaBase) -> Categoria: ...

    @abstractmethod
    def update_categoria(self, categoria: Categoria, base: CategoriaBase) -> Categoria: ...

    @abstractmethod
    def delete_categoria(self, categoria: Categoria): ...


class CategoriaService(CategoriaServiceInterface):
    def __init__(self, repo: CategoriaRepositoryDep):
        self.repo = repo

    def get_categorias(self, offset: int = 0, limit: int = 20) -> Sequence[Categoria]:
        return self.repo.fetch_categorias(offset, limit)

    def get_categoria_by_id(self, categoria_id: int) -> Categoria | None:
        return self.repo.get_by_id(categoria_id)

    def create_categoria(self, base: CategoriaBase) -> Categoria:
        if self.repo.get_by_nombre(base.nombre):
            raise ConflictoError("Ya existe una categoría con ese nombre")
        return self.repo.create_categoria(base)

    def update_categoria(self, categoria: Categoria, base: CategoriaBase) -> Categoria:
        otra = self.repo.get_by_nombre(base.nombre)
        if otra and otra.id != categoria.id:
            raise ConflictoError("Ya existe una categoría con ese nombre")
        return self.repo.update_categoria(categoria, base)

    def delete_categoria(self, categoria: Categoria):
        # RF-06: no se borra una categoría con herramientas.
        if self.repo.contar_herramientas(categoria.id) > 0:
            raise ReglaDeNegocioError("La categoría tiene herramientas asociadas")
        self.repo.delete_categoria(categoria)
```

## 4. Dependencias

Al final de `dependencies.py`. Los imports van abajo por el ciclo `dependencies` ↔ `repositories`, como en la cátedra:

```python
from repositories.categorias import CategoriaRepository  # noqa: E402

CategoriaRepositoryDep = Annotated[CategoriaRepository, Depends(CategoriaRepository)]

from services.categorias import CategoriaService, CategoriaServiceInterface  # noqa: E402

CategoriaServiceDep = Annotated[CategoriaServiceInterface, Depends(CategoriaService)]
```

## 5. Modelos de API

`api/model/categorias.py`

```python
# Nivel de API: lo que viaja por HTTP
from sqlmodel import Field, SQLModel


class CreateCategoriaRequest(SQLModel):
    nombre: str = Field(min_length=2, max_length=60)
    descripcion: str | None = None


class CreateCategoriaResponse(SQLModel):
    id: int


class GetCategoriaResponse(SQLModel):
    id: int
    nombre: str
    descripcion: str | None


class DeleteCategoriaResponse(SQLModel):
    msg: str
```

## 6. Router

`api/categorias.py`. La lectura es pública (sin `@protected`); la escritura pide `gestionar_categorias`, que solo tiene ADMIN.

```python
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer

from api.middlewares.protected import protected
from api.model.categorias import (
    CreateCategoriaRequest,
    CreateCategoriaResponse,
    DeleteCategoriaResponse,
    GetCategoriaResponse,
)
from api.permisos import permission_check
from dependencies import CategoriaServiceDep
from model.categorias import Categoria, CategoriaBase

router = APIRouter(tags=["Categorías"])
bearer = [Depends(HTTPBearer())]  # muestra el candado en /docs solo en las rutas privadas


@router.get("/categorias", response_model=Sequence[GetCategoriaResponse])
def get_categorias(
    service: CategoriaServiceDep, offset: int = 0, limit: Annotated[int, Query(le=100)] = 20
) -> Sequence[Categoria]:
    return service.get_categorias(offset, limit)


@router.post("/categorias", response_model=CreateCategoriaResponse, status_code=201,
             dependencies=[*bearer, Depends(permission_check("gestionar_categorias"))])
@protected
def create_categoria(req: CreateCategoriaRequest, service: CategoriaServiceDep) -> Categoria:
    return service.create_categoria(CategoriaBase(nombre=req.nombre, descripcion=req.descripcion))


@router.patch("/categorias/{categoria_id}", response_model=CreateCategoriaResponse,
              dependencies=[*bearer, Depends(permission_check("gestionar_categorias"))])
@protected
def update_categoria(categoria_id: int, req: CreateCategoriaRequest, service: CategoriaServiceDep) -> Categoria:
    categoria = service.get_categoria_by_id(categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return service.update_categoria(categoria, CategoriaBase(nombre=req.nombre, descripcion=req.descripcion))


@router.delete("/categorias/{categoria_id}", response_model=DeleteCategoriaResponse,
               dependencies=[*bearer, Depends(permission_check("gestionar_categorias"))])
@protected
def delete_categoria(categoria_id: int, service: CategoriaServiceDep) -> DeleteCategoriaResponse:
    categoria = service.get_categoria_by_id(categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    service.delete_categoria(categoria)
    return DeleteCategoriaResponse(msg="Categoría borrada")
```

- `permission_check` se mueve de `api/users.py` (donde lo dejó la cátedra) a `api/permisos.py`, para que lo usen todos los routers. Detalle en `/jwt-permisos`.
- El `ConflictoError` y el `ReglaDeNegocioError` del servicio no se atrapan acá: los traduce el handler de `main.py`.

## 7. main.py y seed

```python
from api import categorias
app.include_router(categorias.router)
```

Si el recurso trae permisos nuevos, sumalos a `PERMISOS` y a `ROL_PERMISOS` en `repositories/seed.py` (ver `/jwt-permisos`).

## Errores del dominio

`services/errores.py`: los servicios no conocen HTTP, así que avisan con excepciones propias.

```python
class ErrorDeDominio(Exception):
    """Base: un mensaje para el usuario final, en español."""


class ReglaDeNegocioError(ErrorDeDominio):  # 400: se violó una RN-xx
    pass


class NoEsDuenioError(ErrorDeDominio):  # 403: RNF-03
    pass


class CuentaNoHabilitadaError(ErrorDeDominio):  # 403: usuario PENDIENTE o SUSPENDIDO (RF-02, RN-10)
    pass


class ConflictoError(ErrorDeDominio):  # 409: duplicado o fechas superpuestas (RN-04)
    pass
```

En `main.py`, un handler por clase. Así cada ruta queda tan corta como las de la cátedra:

```python
from fastapi.responses import JSONResponse

from services.errores import ConflictoError, CuentaNoHabilitadaError, NoEsDuenioError, ReglaDeNegocioError

CODIGOS = {ReglaDeNegocioError: 400, NoEsDuenioError: 403, CuentaNoHabilitadaError: 403, ConflictoError: 409}

for clase, codigo in CODIGOS.items():
    # El default congela el código de cada vuelta del for.
    async def handler(request, exc, codigo=codigo):
        return JSONResponse(status_code=codigo, content={"detail": str(exc)})
    app.add_exception_handler(clase, handler)
```

La respuesta mantiene el formato `{"detail": "..."}` de FastAPI, que es lo que lee `apiFetch` en el frontend.

## Propiedad del recurso

`permission_check` responde "¿tu rol puede publicar herramientas?". No responde "¿esta herramienta es tuya?". Para eso, el servicio recibe el id del usuario logueado (`CurrentUserIdDep`, ver `/jwt-permisos`) y lo compara:

```python
# services/herramientas.py
def editar(self, herramienta: Herramienta, cambios: HerramientaBase, usuario_id: int) -> Herramienta:
    if herramienta.propietario_id != usuario_id:  # RNF-03
        raise NoEsDuenioError("Solo el propietario puede editar esta herramienta")
    return self.repo.update_herramienta(herramienta, cambios)
```

```python
# api/herramientas.py
@router.patch("/herramientas/{herramienta_id}", response_model=CreateHerramientaResponse,
              dependencies=[*bearer, Depends(permission_check("publicar_herramientas"))])
@protected
def editar_herramienta(herramienta_id: int, req: HerramientaRequest,
                       service: HerramientaServiceDep, me_id: CurrentUserIdDep) -> Herramienta:
    herramienta = service.get_by_id(herramienta_id)
    if not herramienta:
        raise HTTPException(status_code=404, detail="Herramienta no encontrada")
    return service.editar(herramienta, HerramientaBase(**req.model_dump()), me_id)
```

Test obligatorio de toda ruta con dueño: otro usuario con el mismo rol recibe 403 (ver `/pytest-api`).
