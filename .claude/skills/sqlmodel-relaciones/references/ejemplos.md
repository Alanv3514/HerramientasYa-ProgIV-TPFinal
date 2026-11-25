# Ejemplos de relaciones

Basados en `model/users.py`, `model/roles.py` y `guia-nn-group-membership.md` de la cátedra, con las tablas de Herramientas Ya.

## 1-N: herramienta → categoría

```python
# model/herramientas.py
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from model.carreras import Carrera, HerramientaCarrera

if TYPE_CHECKING:
    from model.categorias import Categoria
    from model.usuarios import Usuario


class Conservacion(str, Enum):
    NUEVA = "NUEVA"
    MUY_BUENA = "MUY_BUENA"
    BUENA = "BUENA"
    CON_DETALLES = "CON_DETALLES"


class EstadoHerramienta(str, Enum):
    ACTIVA = "ACTIVA"
    INACTIVA = "INACTIVA"
    FUERA_DE_SERVICIO = "FUERA_DE_SERVICIO"


# Nivel de negocio
class HerramientaBase(SQLModel):
    nombre: str = Field(index=True, max_length=80)
    descripcion: str = Field(max_length=1000)
    # Texto libre: la propuesta dice "carreras o materias"; las carreras son N-N, las materias no merecen tabla.
    materias: str | None = Field(default=None, max_length=200)
    categoria_id: int = Field(foreign_key="categoria.id", index=True)
    conservacion: Conservacion
    precio_dia: Decimal = Field(max_digits=10, decimal_places=2, gt=0)
    deposito: Decimal = Field(max_digits=10, decimal_places=2, ge=0)


# Nivel de base de datos
class Herramienta(HerramientaBase, table=True):
    __tablename__ = "herramienta"

    id: int | None = Field(default=None, primary_key=True)
    propietario_id: int = Field(foreign_key="usuario.id", index=True)
    estado: EstadoHerramienta = Field(default=EstadoHerramienta.ACTIVA, index=True)
    oculta: bool = False
    motivo_oculta: str | None = None
    creado_en: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    categoria: "Categoria" = Relationship(back_populates="herramientas")
    propietario: "Usuario" = Relationship(back_populates="herramientas")
    carreras: list[Carrera] = Relationship(back_populates="herramientas", link_model=HerramientaCarrera)
    fotos: list["FotoHerramienta"] = Relationship(back_populates="herramienta", cascade_delete=True)
```

- La FK va en el lado N (`herramienta.categoria_id`).
- `index=True` en las columnas que filtra el catálogo (`RNF-08`).
- Los enums heredan de `str`: se guardan como texto legible y FastAPI los valida y los muestra en `/docs`.

## N-N pura: herramienta ↔ carrera

Mismo patrón que `UserRole` de la cátedra:

```python
# model/carreras.py
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from model.herramientas import Herramienta


# Tabla intermedia Herramienta <-> Carrera (muchos a muchos, sin datos propios)
class HerramientaCarrera(SQLModel, table=True):
    __tablename__ = "herramienta_carrera"

    herramienta_id: int | None = Field(default=None, foreign_key="herramienta.id", primary_key=True)
    carrera_id: int | None = Field(default=None, foreign_key="carrera.id", primary_key=True)


# Nivel de negocio
class CarreraBase(SQLModel):
    nombre: str = Field(unique=True, index=True)


# Nivel de base de datos
class Carrera(CarreraBase, table=True):
    __tablename__ = "carrera"

    id: int | None = Field(default=None, primary_key=True)
    herramientas: list["Herramienta"] = Relationship(back_populates="carreras", link_model=HerramientaCarrera)
```

Asignar carreras en el repositorio, como `add_role` de la cátedra:

```python
carreras = self.session.exec(select(Carrera).where(col(Carrera.id).in_(carrera_ids))).all()
herramienta.carreras = list(carreras)
self.session.add(herramienta)
self.session.commit()
self.session.refresh(herramienta)
```

Filtrar el catálogo por carrera con un join, no en Python:

```python
statement = statement.join(HerramientaCarrera).where(HerramientaCarrera.carrera_id == carrera_id)
```

## N-N con atributos: calificación

Mismo razonamiento que `Membership`: la relación alquiler ↔ usuario tiene datos propios (puntaje, comentario y fecha), así que es una entidad.

```python
# model/calificaciones.py
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel, UniqueConstraint


# Tabla con datos propios: es una entidad, no un link_model
class Calificacion(SQLModel, table=True):
    __tablename__ = "calificacion"
    # RN-09: una calificación por parte y por alquiler. Lo garantiza la base.
    __table_args__ = (UniqueConstraint("alquiler_id", "autor_id"),)

    id: int | None = Field(default=None, primary_key=True)
    alquiler_id: int = Field(foreign_key="alquiler.id", index=True)
    autor_id: int = Field(foreign_key="usuario.id")
    calificado_id: int = Field(foreign_key="usuario.id", index=True)
    rol_calificado: str  # "PROPIETARIO" o "CLIENTE"
    puntaje: int = Field(ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=500)
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

Hay dos FK a `usuario` (autor y calificado). Si se declaran `Relationship` a las dos, SQLAlchemy necesita saber cuál es cuál:

```python
autor: "Usuario" = Relationship(sa_relationship_kwargs={"foreign_keys": "[Calificacion.autor_id]"})
```

Si no hace falta navegar al objeto, alcanza con los ids y se evita la complejidad.

## Evitar N+1 al listar

```python
from sqlalchemy.orm import selectinload

statement = (
    select(Herramienta)
    .options(selectinload(Herramienta.fotos), selectinload(Herramienta.propietario))
    .where(Herramienta.estado == EstadoHerramienta.ACTIVA, Herramienta.oculta == False)  # noqa: E712
    .offset(offset)
    .limit(limit)
)
```

Sin `selectinload`, armar la respuesta de 20 herramientas hace 1 consulta para la lista más 20 para las fotos y 20 para los propietarios. Con él, son 3 consultas en total.

## Preguntas que pueden hacer en la mesa

1. ¿Por qué `HerramientaCarrera` es un `link_model` y `Calificacion` no?
2. ¿Qué dos relaciones 1-N forman la relación entre alquiler y usuario en la calificación?
3. ¿Dónde se garantiza que no se califique dos veces: en el servicio, en la base o en los dos? ¿Qué código HTTP devuelven?
4. ¿Por qué las fotos se borran en cascada y los alquileres no?
