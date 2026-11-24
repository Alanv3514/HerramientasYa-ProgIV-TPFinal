---
name: fastapi-sqlmodel
description: Cómo escribir backend en Herramientas Ya con FastAPI y SQLModel, en capas, tal como lo enseñó la cátedra en la API clase-1-sqlmodel (modelo → repositorio → servicio → dependencias → modelos de API → router → main.py → tests). Usala siempre que haya que crear o modificar un endpoint, una tabla, un repositorio, un servicio o una regla de negocio en backend/, aunque el pedido no diga "FastAPI" (por ejemplo "hacé el ABM de categorías", "agregá el endpoint de solicitar alquiler", "implementá RN-04").
---

# Backend con FastAPI y SQLModel, como en la cátedra

La cátedra armó la API `clase-1-sqlmodel` en capas. Cada capa usa solo la de abajo, y cada paso termina con algo que se puede probar. En la mesa nos van a preguntar dónde está cada cosa: si respetamos el mismo orden que el profe, la respuesta es siempre la misma.

```
api/<recurso>.py           router: HTTP, permisos, códigos de error     → no sabe de SQL
api/model/<recurso>.py     Request y Response: lo que viaja por HTTP
services/<recurso>.py      interfaz (ABC) + implementación: reglas RN-xx → no sabe de HTTP
repositories/<recurso>.py  consultas con la sesión de SQLModel          → no sabe de reglas
model/<recurso>.py         "Nivel de negocio" (Base) y "Nivel de base de datos" (table=True)
dependencies.py            Annotated[..., Depends(...)] de cada repositorio y servicio
```

Los ejemplos completos de cada archivo están en [references/capas.md](references/capas.md). Leelo antes de escribir el primer archivo de un recurso nuevo.

## Orden de trabajo

Es el orden de la guía de la cátedra. No lo saltees: cada paso deja algo que se puede verificar.

1. **Modelo** (`model/<recurso>.py`). Una clase `XBase(SQLModel)` con los campos de negocio, bajo el comentario `# Nivel de negocio`. Una clase `X(XBase, table=True)` con `id` y relaciones, bajo `# Nivel de base de datos`. Para relaciones, usá la skill `/sqlmodel-relaciones`.
   - Chequeo: `python -c "import main"` no falla.
2. **Repositorio** (`repositories/<recurso>.py`). Una clase `XRepository` que recibe `session: SessionDep`. Cada método es una consulta: `select(...)`, `.offset().limit()`, `session.get`, `add` + `commit` + `refresh`. Acá no hay reglas de negocio ni `HTTPException`.
3. **Servicio** (`services/<recurso>.py`). Primero `XServiceInterface(ABC)` con los `@abstractmethod`. Después `XService(XServiceInterface)`, que recibe el repositorio por `XRepositoryDep`. Acá van las reglas `RN-xx` (ver más abajo).
4. **Dependencias** (`dependencies.py`). Al final del archivo, con el import abajo para evitar el ciclo (`# noqa: E402`):
   - `XRepositoryDep = Annotated[XRepository, Depends(XRepository)]`;
   - `XServiceDep = Annotated[XServiceInterface, Depends(XService)]`.
5. **Modelos de API** (`api/model/<recurso>.py`): `CreateXRequest`, `CreateXResponse` (`{id}`), `GetXsResponse` (lo mínimo para un listado), `GetXResponse` (el detalle) y `DeleteXResponse` (`{msg}`). Nunca devuelvas la tabla directo si tiene datos sensibles: el `response_model` filtra.
6. **Router** (`api/<recurso>.py`): `APIRouter(tags=[...], dependencies=[Depends(HTTPBearer())])`, `@protected` y `dependencies=[Depends(permission_check("permiso"))]` en cada ruta privada. Los permisos se explican en `/jwt-permisos`.
7. **Registrar** el router en `main.py` con `app.include_router(...)`, y los permisos nuevos en el seed.
8. **Tests** en `tests/api/test_<recurso>.py`, con la skill `/pytest-api`.
9. **Probar a mano** en `http://localhost:8000/docs` (Authorize con el token del login).

## Dónde va cada cosa

| Necesito… | Va en | Ejemplo |
| --- | --- | --- |
| Un `404` porque no existe | router | `if not x: raise HTTPException(404, "Herramienta no encontrada")` |
| Un `403` por permiso | `permission_check` | `Depends(permission_check("publicar_herramientas"))` |
| Un `403` porque no es el dueño | servicio, el router lo traduce | `RNF-03` |
| Una regla `RN-xx` (fechas, costo, estados) | servicio, como función pura | `calcular_costo(inicio, fin, precio_dia)` |
| Un filtro o un conteo | repositorio, en SQL | `where(Herramienta.precio_dia <= maximo)` |
| Validar el formato de un dato | `api/model` con `Field(...)` | `Field(min_length=8)`, `EmailStr` → 422 automático |

### Reglas de negocio: funciones puras más el servicio

La cátedra deja las reglas simples en el router; nosotros tenemos 11 `RN` y la consigna pone el foco en la calidad. Por eso:

- Cada regla es una **función pura** en el servicio, o en `services/reglas_<módulo>.py` si son varias. Recibe datos y devuelve un resultado o lanza una excepción del dominio, sin sesión ni HTTP. Así se testea sin base (`/pytest-api`).
- El servicio la llama, y si hay un error lanza una excepción propia, por ejemplo `ReglaDeNegocioError`, `NoEsDuenioError` o `ConflictoDeFechasError`, definida en `services/errores.py`.
- El router traduce la excepción a HTTP. Usamos los códigos de `docs/requisitos.md`, sección 7: 400 regla, 403 no es el dueño, 404 no existe, 409 conflicto de fechas, 422 validación.

Con un solo `@app.exception_handler` por excepción en `main.py` se evita repetir `try/except` en cada ruta. El ejemplo está en [references/capas.md](references/capas.md#errores-del-dominio).

## Diferencias con el código de la cátedra

Son a propósito; si te preguntan, esta es la justificación:

| Cátedra | Herramientas Ya | Por qué |
| --- | --- | --- |
| `JWTService("my-secret-key")` | la clave sale de `.env` | Lo pide la propia guía de JWT y `RNF-02` |
| `allow_origins=["*"]` | el origen del frontend | `RNF-05` |
| Mensajes `"User not found"` | en español | Los ve el usuario final, `RNF-10` |
| Reglas en el router | reglas en servicios, con excepciones del dominio | `RN-xx` testeables, `RNF-13` |
| `limit` hasta 100 | por defecto 20, máximo 100 | `RNF-07` |
| Montos como `int` | `Decimal` | Redondeo, sección 6 de requisitos |
| `create_all` al iniciar | `create_all` (alcanza para la mesa) | Si cambia el esquema con datos, recrear el volumen o sumar Alembic: la guía de PostgreSQL lo menciona |

## Rendimiento (RNF-07, RNF-08, RNF-09)

- Los listados aceptan `offset` y `limit: Annotated[int, Query(le=100)] = 20`, como `fetch_users` de la cátedra.
- Filtros, superposición de fechas y promedios se resuelven en el `select`, nunca trayendo todo y filtrando en Python.
- Para listar con datos relacionados, como propietario, primera foto o reputación, usá `selectinload` o un `join` en el repositorio. Si no, cada fila dispara otra consulta (el problema N+1).
- Índices con `Field(index=True)` en las columnas que se filtran: `estado`, `categoria_id`, `herramienta_id`, fechas.

## Antes de terminar

- [ ] Cada capa usa solo la de abajo: el router no tiene `select`, el repositorio no tiene `HTTPException`.
- [ ] Cada ruta privada tiene `@protected` y su `permission_check`, y las que tocan recursos de un usuario verifican la propiedad.
- [ ] Las reglas `RN-xx` que toca la tarjeta tienen su test.
- [ ] `ruff check .` y `pytest` pasan.
- [ ] Probado en `/docs` con un usuario que puede y con uno que no.
