# 📌 Cómo trabajamos — leer antes de tomar una tarjeta

Esta guía también está en el issue fijado #1. Si cambia una regla, se actualizan los dos.

## El tablero

GitHub Project **Herramientas Ya**: <https://github.com/users/Alanv3514/projects> (vista Tablero, agrupada por `Status`).

| Columna | Qué significa | Quién mueve la tarjeta |
| --- | --- | --- |
| 📌 Cómo trabajamos | Esta guía y la plantilla. No se mueven | — |
| Backlog | Idea cargada, todavía sin refinar o sin prioridad para esta iteración | Cualquiera |
| Para hacer | Refinada: tiene criterios de aceptación, talle y dependencias. Se puede tomar | El grupo, en la planificación de cada iteración |
| En curso | Alguien la está haciendo. **Máximo 2 por persona** | `/tarjeta-iniciar` |
| En revisión | Tiene un pull request abierto esperando revisión | `/tarjeta-entregar` |
| Hecho | PR integrado a `main` | `/tarjeta-cerrar` (o GitHub al cerrar el issue) |

### Campos de cada tarjeta

| Campo | Valores |
| --- | --- |
| Área | Backend, Frontend, Infra, Docs |
| Módulo | Base, Usuarios, Categorías, Herramientas, Catálogo, Alquileres, Calificaciones, Historial, Administración, Calidad, Defensa |
| Prioridad | Alta (imprescindible para aprobar), Media, Baja (si da el tiempo) |
| Talle | S (hasta 2 h), M (2 a 5 h), L (5 a 8 h). Si es más grande que L, se divide |
| Iteración | 1 (25/11 al 30/11: estructura, usuarios y herramientas), 2 (1/12 al 6/12: alquileres y pantallas principales), 3 (7/12 al 11/12: administración, calidad y cierre), 4 (12/12 al 16/12: estudio, ensayo y presentación) |
| Inicio y Fin | Fechas planificadas. Se ven en la vista «Cronograma (Gantt)». Si una tarjeta se atrasa, se corrige el Fin y se avisa en el grupo, porque puede correr las fechas de otras |

### Calendario

- **11/12:** código terminado. Todo integrado a `main`.
- **12/12 al 15/12:** estudio y ensayo de la defensa (#50).
- **16/12:** presentación.

El Gantt con el plan de cada persona y los supuestos de horas está en [cronograma.md](cronograma.md). Las tarjetas de prioridad Media y Baja tienen fecha, pero son las primeras que se recortan si hay atraso.

## Reglas

1. **Todo trabajo es una tarjeta.** Si aparece algo nuevo (un bug, una mejora), se crea con `/tarjeta-nueva` o duplicando la plantilla (#2). No se hace "de paso" en otra rama.
2. **Una tarjeta, una rama, un pull request.** Rama `tipo/NN-descripcion-corta`, que sale de `main` actualizada. Nadie trabaja sobre `main`: está protegida y solo recibe pull requests (1 aprobación, sin push directo ni force push, ni siquiera del admin). Al integrar, la rama se borra sola.
   - **Única excepción: las tarjetas de estructura #4 a #8.** Son las bases sobre las que trabaja el resto, así que Alan las integra sin esperar la aprobación, para no frenar a los demás. La #3 (estructura del monorepo) va en el mismo PR que la #4 (`Closes #3` y `Closes #4`).
   - Mientras duran, la protección de `main` no se aplica al admin (`enforce_admins` desactivado), y el resto del equipo sigue necesitando 1 aprobación.
   - Igual se abre el pull request, con la prueba de integración (regla 5), y el equipo puede revisarlo después del merge.
   - La tarjeta #8 cierra la excepción: vuelve a activar `enforce_admins` y suma el CI como check obligatorio.
3. **Dependencias que no bloquean.** La línea «Depende de» lista los issues que tienen que estar en Hecho **para entregar**, no para empezar. Así cada uno sigue su propio flujo sin esperar a los demás:
   - **Del esqueleto (#3, #4, #5):** son las únicas que bloquean el inicio. Sin ellas no hay dónde escribir código.
   - **De otra persona:**
     - Se arranca igual, contra el contrato de `docs/requisitos.md`: el modelo de datos (§6) y la API (§7), con sus rutas, cuerpos y códigos.
     - En el frontend, se escribe la función de `api/` con su tipo, y la pantalla se prueba cuando el endpoint llega a `main`.
     - En el backend, primero va la parte propia (reglas, servicio, tests unitarios), y lo que usa código del otro se integra al rebasar.
   - **Tuyas:** se hacen en orden.
   - Si el contrato no alcanza o hay que cambiarlo, se avisa en el grupo antes de cambiarlo, nunca en silencio.
   - Si una tarjeta queda trabada igual, lleva la etiqueta `bloqueada` y un comentario con el motivo.
4. **Revisión cruzada.** Cada PR lo revisa alguien de la otra capa: backend revisa frontend y al revés. Así todos conocen todo el sistema para la defensa.
5. **Prueba de integración antes del PR.** Antes de abrir el pull request, quien entrega comprueba que el proyecto no se rompe después del merge (`/tarjeta-entregar` lo guía):
   1. Rebasa la rama sobre `origin/main` actualizada.
   2. Corre **toda** la suite del backend, incluido el test de humo `tests/api/test_humo.py`, que recorre el flujo principal de punta a punta. También corre el lint y el build del frontend.
   3. Levanta todo con `docker compose up --build`.
   4. Ingresa con un usuario del seed y recorre el flujo principal hasta donde exista. Después revisa lo que tocó la tarjeta.

   Si algo falla, aunque sea de otra tarjeta, no se abre el PR y se avisa en el grupo. Si `main` avanzó mientras el PR esperaba la revisión, se repite la prueba antes del merge.
6. **CI en verde** para integrar: tests, lint y build. Se integra con squash merge.
7. **Commits:**
   - Formato `tipo(módulo): descripción en presente`, con `Refs: #NN, RF-xx` en el cuerpo.
   - Sin coautoría de herramientas de IA.
8. **Fuente de verdad:** `docs/requisitos.md`. Si una tarjeta lo contradice, manda el documento. Si el documento no cubre un caso, se pregunta en el grupo antes de inventar.
9. **Uso de IA:** cada uno puede usar Claude Code con las skills del repo (`.claude/skills/`). El código generado se revisa y se entiende antes de commitearlo: en la mesa la nota es individual.

## Flujo con Claude Code

| Momento | Skill | Qué hace |
| --- | --- | --- |
| Hay algo nuevo | `/tarjeta-nueva` | Arma el issue con la plantilla y lo suma al Backlog |
| Empiezo | `/tarjeta-iniciar NN` | Valida estado y dependencias, crea la rama, mueve a En curso y propone un plan |
| Implemento | `/fastapi-sqlmodel`, `/sqlmodel-relaciones`, `/jwt-permisos`, `/pytest-api`, `/postgresql-docker`, `/react-frontend` | Cada tecnología, como la dio la cátedra |
| Commiteo | `/tarjeta-commit` | Revisa el diff y propone el commit |
| Termino | `/tarjeta-entregar` | Verifica la Definición de Hecho, abre el PR y mueve a En revisión |
| Se integró | `/tarjeta-cerrar NN` | Limpia la rama, registra horas reales y sugiere la siguiente |

Sin Claude Code, el flujo es el mismo a mano. `node scripts/tablero.mjs` muestra y mueve tarjetas desde la terminal: `ver NN`, `mover NN "En curso"`, `siguiente`.

## Definición de Hecho

1. Cumple todos los criterios de aceptación.
2. Tiene tests y pasa toda la suite (incluido el test de humo), junto con el lint y el build.
3. `docs/` está actualizado si cambió una ruta, una regla o cómo se levanta el sistema.
4. Pasó la prueba de integración: rebasada sobre `main`, funciona con `docker compose up` (regla 5).
5. Quien la hizo puede explicar el código en la defensa.

## Configuración inicial (una vez por persona)

```bash
gh auth login                  # si nunca usaste la CLI de GitHub
gh auth refresh -s project     # permiso para leer y mover tarjetas del Project
git config user.name "Tu Nombre"
git config user.email "tu-email-de-github"
```
