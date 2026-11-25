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
