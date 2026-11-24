---
name: tarjeta-entregar
description: Verifica que la tarjeta en curso cumple la Definición de Hecho y sus criterios de aceptación, sube la rama, abre el pull request y pasa la tarjeta a En revisión en el GitHub Project.
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git log *) Bash(git diff *) Bash(git fetch *) Bash(git branch *) Bash(node scripts/tablero.mjs *) Bash(gh issue view *) Bash(gh pr view *) Bash(gh pr list *)
---

# Entregar la tarjeta en curso

## Estado actual

- Rama: !`git branch --show-current`
- Cambios sin commitear:
!`git status --short`

## Pasos

1. **Validar.** Si la rama es `main` o hay cambios sin commitear, detenete y avisá. Sacá NN del nombre de la rama.

2. **Obtener los criterios de aceptación** con `node scripts/tablero.mjs ver NN`. Sin permiso de Projects, usá `gh issue view NN`.

3. **Correr las verificaciones** de la sección «Comandos» de `CLAUDE.md`, según lo que toque la rama (`git diff --stat origin/main...HEAD`):
   - **Backend:** `pytest --cov=services --cov=api --cov=repositories --cov-report=term-missing` y `ruff check .`, desde `backend/`.
   - **Frontend:** `npm run lint` y `npm run build`, desde `frontend/`.

   Si un comando todavía no existe porque la estructura no está armada, avisá y pedí el comando correcto.

4. **Verificar la Definición de Hecho** y presentá una tabla con evidencia concreta por fila:

   | Punto | Estado | Evidencia |
   |---|---|---|
   | Cada criterio de aceptación (una fila por criterio) | ✅ / ❌ | Test o archivo que lo demuestra |
   | Tests, lint y build pasan | ✅ / ❌ | Resultado de los comandos |
   | Cobertura de `services/` (si la tarjeta es de backend) | % | Salida de `--cov` |
   | `docs/` actualizado si cambió una ruta, una regla o cómo se levanta | ✅ / ❌ / N/A | Archivo modificado |
   | Funciona con `docker compose up` | Pendiente de confirmación manual | — |
   | Quien entrega puede explicar el código | Pendiente de confirmación | — |

   Si algún punto está en ❌, detenete: la tarjeta no está lista. Para «puede explicar el código», ofrecé un resumen de cada archivo cambiado y las preguntas que podría hacer la cátedra sobre ellos.

5. **Actualizar con `main`.** `git fetch origin` y revisá si `origin/main` avanzó respecto de la rama. Si avanzó, proponé `git rebase origin/main`, volvé a correr las verificaciones y esperá confirmación.

6. **Preparar el pull request** con `.github/pull_request_template.md` y mostralo:

   ```
   Título: tipo(módulo): descripción (#NN)

   Closes #NN

   **Requisitos:** RF-xx / RN-xx / RNF-xx

   ## Qué cambia
   <dos o tres líneas>

   ## Cómo probarlo
   <pasos con un usuario de prueba>

   ## Definición de Hecho
   - [x] Criterios de aceptación cubiertos
   - [x] Tests, lint y build en verde
   - [x] docs/ actualizado (o N/A)
   - [ ] Verificado con Docker Compose
   - [ ] Puedo explicar cada cambio en la defensa
   ```

   - Sin firmas de herramientas de IA en el cuerpo (`CLAUDE.md`).
   - `Closes #NN` hace que GitHub cierre el issue al integrar el PR.

7. **Esperar confirmación** para el push de la rama, la creación del PR y el movimiento de la tarjeta.

8. **Con la confirmación:**
   - `git push -u origin <rama>`.
   - `gh pr create --title "..." --body-file <archivo>` (escribí el cuerpo en un archivo temporal para no romper el formato).
   - Pedí revisión a alguien de la otra capa: `gh pr edit --add-reviewer <usuario>`. Equipo: FefeSaenz (frontend), santiansaa (backend), almaranteManuel y Alanv3514 (fullstack).
   - `node scripts/tablero.mjs mover NN "En revisión"`.

9. **Recordá al usuario** que espere el CI en verde y la aprobación, y que integre con **squash merge**. Después del merge: `/tarjeta-cerrar NN`.
