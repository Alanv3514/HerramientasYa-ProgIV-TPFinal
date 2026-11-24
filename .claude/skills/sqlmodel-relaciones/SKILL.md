---
name: sqlmodel-relaciones
description: Cómo modelar relaciones entre tablas con SQLModel en Herramientas Ya, como lo enseñó la cátedra (1-N con Relationship y back_populates, N-N pura con link_model como UserRole, N-N con atributos como entidad propia como Membership, cascade_delete y TYPE_CHECKING para imports circulares). Usala siempre que una tarjeta agregue o cambie una tabla que se relaciona con otra (herramienta↔categoría, herramienta↔carrera, usuario↔rol, alquiler↔herramienta, historial, calificaciones, fotos).
---

# Relaciones con SQLModel, como en la cátedra

La cátedra mostró tres formas de relacionar tablas. Elegir bien cuál usar es una pregunta típica de la mesa: "¿por qué `UserRole` es un `link_model` y `Membership` no?".

| Caso | Cómo se modela | Ejemplo de la cátedra | En Herramientas Ya |
| --- | --- | --- | --- |
| 1-N | FK en el lado N + `Relationship(back_populates=...)` en los dos lados | `UserDB.country` ↔ `Country.users` | herramienta → categoría, foto → herramienta, alquiler → herramienta, alquiler → cliente |
| N-N sin datos propios | Tabla intermedia con PK compuesta, usada como `link_model` | `UserRole`, `RolePermission` | usuario ↔ rol, rol ↔ permiso, herramienta ↔ carrera |
| N-N con datos propios | La tabla intermedia es una **entidad**: dos 1-N | `Membership` (`joined_at`, `is_leader`) | calificación (alquiler + autor + puntaje), historial de estados |

Regla para decidir: si la relación necesita aunque sea una columna propia (una fecha, un puntaje, un flag), `link_model` ya no alcanza y se modela como entidad.

Los ejemplos con el código completo están en [references/ejemplos.md](references/ejemplos.md).

## Pasos

1. **Elegí el caso** con la tabla de arriba y escribí en el modelo un comentario corto con el porqué, como hace la cátedra:
   - `# Tabla intermedia Herramienta <-> Carrera (muchos a muchos)`;
   - `# Tabla intermedia con datos propios: es una entidad, no un link_model`.
2. **Foreign keys**: `Field(default=None, foreign_key="<tabla>.id")`. El nombre de la tabla es el de la clase en minúsculas (`UserDB` → `"userdb"`), salvo que definas `__tablename__`. Usamos `__tablename__` en español y en singular (`"usuario"`, `"herramienta"`) para que coincida con `docs/requisitos.md`.
3. **Relaciones en los dos lados** con el mismo `back_populates`. El tipo del lado "uno" es `X | None`, y el del lado "muchos", `list[X]`.
4. **Imports circulares**: el módulo que importa "hacia atrás" usa `if TYPE_CHECKING:` y el tipo entre comillas (`list["Herramienta"]`), como `model/roles.py`.
5. **Borrado**:
   - `cascade_delete=True` en el lado "uno" cuando los hijos no tienen sentido sin el padre (fotos de una herramienta).
   - Nunca en alquileres ni calificaciones: no se borran herramientas ni usuarios (`RF-10`, baja lógica).
6. **Registro de tablas**: `create_all` solo crea las tablas que ya se importaron. Si `python -c "import main"` falla con un error de mappers, falta importar algún modelo.
7. **Consultas**: para leer relaciones en un listado, `selectinload` en el repositorio para evitar N+1 (`RNF-09`). En el detalle de un solo registro alcanza con el acceso perezoso (`herramienta.categoria`).

## Decisiones ya tomadas en este proyecto

- `usuario_rol` y `rol_permiso`: `link_model`, como en la cátedra.
- `herramienta_carrera`: `link_model`. Una herramienta sirve para varias carreras y una carrera tiene muchas herramientas.
- `alquiler`: entidad con dos FK (`herramienta_id`, `cliente_id`). El propietario se obtiene de la herramienta; no se duplica.
- `historial_estado_alquiler`: 1-N desde alquiler, con `usuario_id` de quien hizo el cambio (`RF-17`).
- `calificacion`: entidad con `UniqueConstraint("alquiler_id", "autor_id")`. La base impide calificar dos veces (`RN-09`), igual que la PK compuesta de `Membership` impide unirse dos veces.
- Montos (`precio_dia`, `deposito`, `costo`, `recargo`, `deuda`): `Decimal = Field(max_digits=10, decimal_places=2)`.

## Antes de terminar

- [ ] La relación está declarada en los dos lados, con el mismo `back_populates`.
- [ ] El comentario dice por qué es `link_model` o por qué es entidad.
- [ ] `python -c "import main"` no falla y la app levanta con la base vacía.
- [ ] Hay un test que crea los dos lados y lee la relación, más uno del caso de unicidad o cascada si corresponde.
