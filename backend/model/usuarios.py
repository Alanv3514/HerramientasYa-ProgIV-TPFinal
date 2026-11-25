from datetime import UTC, datetime
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel

from model.roles import Role, UsuarioRol


class EstadoUsuario(str, Enum):
    PENDIENTE = "PENDIENTE"
    VALIDADO = "VALIDADO"
    SUSPENDIDO = "SUSPENDIDO"


class UsuarioBase(SQLModel):
    nombre: str
    apellido: str
    email: str = Field(unique=True, index=True)
    telefono: str
    # La FK a carrera.id se integra cuando la #10 incorpore la tabla carrera.
    carrera_id: int
    legajo: str


class Usuario(UsuarioBase, table=True):
    __tablename__ = "usuario"

    id: int | None = Field(default=None, primary_key=True)
    password_hash: str
    estado: EstadoUsuario = EstadoUsuario.PENDIENTE
    creado_en: datetime = Field(default_factory=lambda: datetime.now(UTC))
    roles: list[Role] = Relationship(back_populates="usuarios", link_model=UsuarioRol)
