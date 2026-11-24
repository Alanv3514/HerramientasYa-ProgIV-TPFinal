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
| Iteración | 1 (24/11 al 30/11), 2 (1/12 al 7/12), 3 (8/12 al 14/12) |

## Reglas

1. **Todo trabajo es una tarjeta.** Si aparece algo nuevo (un bug, una mejora), se crea con `/tarjeta-nueva` o duplicando la plantilla (#2). No se hace "de paso" en otra rama.
2. **Una tarjeta, una rama, un pull request.** Rama `tipo/NN-descripcion-corta`, que sale de `main` actualizada.
3. **Dependencias.** La línea «Depende de» lista los issues que tienen que estar en Hecho antes de empezar. Si una tarjeta queda trabada, lleva la etiqueta `bloqueada` y un comentario con el motivo.
4. **Revisión cruzada.** Cada PR lo revisa alguien de la otra capa: backend revisa frontend y al revés. Así todos conocen todo el sistema para la defensa.
5. **CI en verde** para integrar: tests, lint y build. Se integra con squash merge.
6. **Commits:**
   - Formato `tipo(módulo): descripción en presente`, con `Refs: #NN, RF-xx` en el cuerpo.
   - Sin coautoría de herramientas de IA.
7. **Fuente de verdad:** `docs/requisitos.md`. Si una tarjeta lo contradice, manda el documento. Si el documento no cubre un caso, se pregunta en el grupo antes de inventar.
8. **Uso de IA:** cada uno puede usar Claude Code con las skills del repo (`.claude/skills/`). El código generado se revisa y se entiende antes de commitearlo: en la mesa la nota es individual.

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
2. Tiene tests y todos pasan, junto con el lint y el build.
3. `docs/` está actualizado si cambió una ruta, una regla o cómo se levanta el sistema.
4. Funciona con `docker compose up`.
5. Quien la hizo puede explicar el código en la defensa.

## Configuración inicial (una vez por persona)

```bash
gh auth login                  # si nunca usaste la CLI de GitHub
gh auth refresh -s project     # permiso para leer y mover tarjetas del Project
git config user.name "Tu Nombre"
git config user.email "tu-email-de-github"
```
