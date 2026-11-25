---
name: pytest-api
description: Cómo escribir y correr los tests del backend de Herramientas Ya con pytest y TestClient, como lo enseñó la cátedra en testing-guide.md (conftest con SQLite en memoria y StaticPool, dependency_overrides de get_session, fixtures de seed y de headers por rol, parametrize para los 401, casos de error además del camino feliz), más tests unitarios de las reglas de negocio RN-xx. Usala siempre que haya que escribir, corregir o correr tests, medir cobertura, o cuando una tarjeta de backend llegue a sus criterios de aceptación.
---

# Tests con pytest, como en la cátedra

La guía de testing de la cátedra escribe tests de **integración**: cada request pasa por middleware, router, servicio, repositorio y una base SQLite en memoria. Nosotros sumamos tests **unitarios** de las reglas `RN-xx`, que son funciones puras (ver `/fastapi-sqlmodel`). Son los que más rápido encuentran un error en el cálculo de fechas o de montos.

| Tipo | Dónde | Qué prueba | Ejemplo |
| --- | --- | --- | --- |
| Integración | `tests/api/test_<recurso>.py` | Endpoints: códigos HTTP, permisos, propiedad, cuerpo de la respuesta | `POST /alquileres` con fechas superpuestas → 409 |
| Unitario | `tests/services/test_reglas_<módulo>.py` | Una regla, sin base ni HTTP | `se_superponen(1→3, 3→5)` es `True` |

El código de `conftest.py` y los ejemplos están en [references/ejemplos.md](references/ejemplos.md).

## Estructura

```
backend/
├── pyproject.toml        [tool.pytest.ini_options] pythonpath = ["."]
└── tests/
    ├── conftest.py       session, client, seed y headers por rol
    ├── api/              integración, uno por router, más test_humo.py (flujo completo)
    └── services/         unitarios de reglas y de JWTService
```

## Pasos para testear una tarjeta

1. **Leé los criterios de aceptación** y anotá un test por criterio. El nombre dice qué verifica, en español: `test_solicitar_fechas_superpuestas_devuelve_409`.
2. **Reglas primero**: si la tarjeta toca una `RN-xx`, escribí el test unitario con `@pytest.mark.parametrize` y los casos límite:
   - el mismo día;
   - fechas que se tocan en un extremo (son inclusivas);
   - 30 y 31 días;
   - recargo mayor que el depósito.
3. **Endpoints**, con las fixtures de `conftest.py`. Para cada ruta nueva, como mínimo:
   - camino feliz: 200 o 201, y el dato quedó guardado (un `GET` después lo devuelve);
   - sin token → 401: sumá la ruta a la lista parametrizada de `test_rutas_protegidas`;
   - rol sin el permiso → 403;
   - otro usuario del mismo rol, no dueño → 403 (`RNF-03`);
   - inexistente → 404;
   - body inválido → 422, y la regla de negocio violada → 400 o 409.
4. **Corré**: `pytest -x` mientras desarrollás, y `pytest --cov=services --cov=api --cov=repositories --cov-report=term-missing` antes de entregar.
5. **Comprobá que el test sirve**, como en el ejercicio 7 de la guía: rompé a propósito el código (cambiá un `<=` por `<`) y fijate que el test falla.

## Test de humo (`tests/api/test_humo.py`)

Es el test de integración que se corre antes de cada pull request (`/tarjeta-entregar`). Responde una sola pregunta: después de este merge, ¿el sistema sigue funcionando de punta a punta?

- Es **un solo test** que recorre el flujo principal como lo haría un usuario:
  1. registro de un propietario y de un cliente;
  2. login de los dos y `GET /me`;
  3. publicar una herramienta;
  4. buscarla en el catálogo;
  5. solicitar el alquiler;
  6. confirmar, entregar y devolver;
  7. calificar;
  8. ver el historial.
- **Crece con el proyecto.** La tarjeta que agrega un paso de ese flujo lo suma al final del test. Mientras un paso no exista, el test termina antes.
- Cada paso verifica el código HTTP y el dato que usa el paso siguiente (el `id` de la herramienta, el del alquiler). No repite los casos de error: esos están en los tests de cada router.
- Usa las mismas fixtures de `conftest.py` (SQLite en memoria). Si falla y los tests de la tarjeta pasan, el problema es la integración con lo que ya estaba en `main`.

## Reglas de la cátedra que respetamos

- Nunca contra la base real: `get_session` se reemplaza con `app.dependency_overrides`, y se limpia en el `yield`.
- `StaticPool`: sin él, cada conexión ve una base en memoria distinta (`no such table`).
- Cada test arranca con la base vacía (fixtures por función). Ningún test depende del orden ni de otro test.
- Las contraseñas del seed van con `hash_password`. Si no, el login da siempre 401.
- `TestClient(app)` sin `with`, para que no corra el `startup` (que crearía la base real y el seed).
- Un test verifica una cosa.

## Cobertura (RNF-13)

- El objetivo es 70 % o más en `services/`. El CI la mide, y la tarjeta de calidad de la iteración 3 la exige.
- Importa más que cada `RN-xx` tenga su test que el número. En la mesa pueden pedir "mostrame el test de la superposición".

## Errores frecuentes

| Síntoma | Causa |
| --- | --- |
| `ModuleNotFoundError: No module named 'main'` | Falta `pythonpath = ["."]` en `pyproject.toml` |
| `no such table: ...` | Falta `StaticPool`, o el modelo no se importó antes de `create_all` |
| El login da 401 en los tests | Contraseña del seed sin `hash_password` |
| Todo da 401 con token | El header no es exactamente `Authorization: Bearer <token>` |
| Pasa solo, falla junto con otros | Quedó un `dependency_overrides` sin limpiar, o se usó la base real |
| Aparece `database.db` o cambia Postgres | Se usó `with TestClient(app)` o no se reemplazó `get_session` |
| Una comparación de montos falla por decimales | Se usó `float`; compará con `Decimal("1500.00")` |
