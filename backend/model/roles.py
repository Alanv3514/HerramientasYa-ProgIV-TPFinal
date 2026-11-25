from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from model.usuarios import Usuario


# Las asociaciones no tienen datos propios. Cada par de claves identifica un vínculo.
class UsuarioRol(SQLModel, table=True):
    __tablename__ = "usuario_rol"

    usuario_id: int = Field(foreign_key="usuario.id", primary_key=True)
    rol_id: int = Field(foreign_key="rol.id", primary_key=True)


class RolPermiso(SQLModel, table=True):
    __tablename__ = "rol_permiso"

    rol_id: int = Field(foreign_key="rol.id", primary_key=True)
    permiso_id: int = Field(foreign_key="permiso.id", primary_key=True)


class Permission(SQLModel, table=True):
    __tablename__ = "permiso"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    roles: list["Role"] = Relationship(back_populates="permissions", link_model=RolPermiso)


class Role(SQLModel, table=True):
    __tablename__ = "rol"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    permissions: list[Permission] = Relationship(back_populates="roles", link_model=RolPermiso)
    usuarios: list["Usuario"] = Relationship(back_populates="roles", link_model=UsuarioRol)
