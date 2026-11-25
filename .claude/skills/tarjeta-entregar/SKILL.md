---
name: tarjeta-entregar
description: Verifica que la tarjeta en curso cumple la Definición de Hecho y sus criterios de aceptación, la rebasa sobre main, corre la prueba de integración (suite completa, test de humo y Docker Compose), sube la rama, abre el pull request y pasa la tarjeta a En revisión en el GitHub Project.
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git log *) Bash(git diff *) Bash(git fetch *) Bash(git branch *) Bash(pytest *) Bash(ruff check *) Bash(npm run lint) Bash(npm run build) Bash(node scripts/tablero.mjs *) Bash(gh issue view *) Bash(gh pr view *) Bash(gh pr list *)
---

# Entregar la tarjeta en curso

## Estado actual

- Rama: !`git branch --show-current`
- Cambios sin commitear:
!`git status --short`

## Pasos

1. **Validar.** Si la rama es `main` o hay cambios sin commitear, detenete y avisá. Sacá NN del nombre de la rama.

2. **Obtener los criterios de aceptación** con `node scripts/tablero.mjs ver NN`. Sin permiso de Projects, usá `gh issue view NN`.

3. **Actualizar con `main` antes de probar.** `git fetch origin` y revisá si `origin/main` avanzó respecto de la rama. Si avanzó, proponé `git rebase origin/main` y esperá confirmación. Las pruebas de los pasos siguientes tienen que correr sobre la rama ya rebasada: así prueban cómo va a quedar `main` después del merge, no cómo estaba cuando empezaste.

4. **Correr las verificaciones** de la sección «Comandos» de `CLAUDE.md`. Corré **toda** la suite, no solo los tests de la tarjeta, porque lo que se rompe suele ser lo de otro:
   - **Backend:** `pytest --cov=services --cov=api --cov=repositories --cov-report=term-missing` y `ruff check .`, desde `backend/`. Incluye el test de humo `tests/api/test_humo.py` (ver `/pytest-api`).
   - **Frontend:** `npm run lint` y `npm run build`, desde `frontend/`.

   Si un comando todavía no existe porque la estructura no está armada, avisá y pedí el comando correcto.

5. **Prueba de integración con Docker.** Es obligatoria antes de abrir el PR. Pedile al usuario que la haga y que te diga el resultado; tarda unos minutos:
   1. `docker compose up --build`, desde la raíz y con la rama rebasada.
   2. La API responde en `/docs` y la web carga.
   3. Ingresar con un usuario del seed y recorrer el flujo principal hasta donde exista: catálogo, detalle, solicitar y confirmar. Después, la pantalla o la ruta que tocó la tarjeta.
   4. No aparecen errores en los logs de `api` ni en la consola del navegador.
   5. `docker compose down`.

   Si algo falla, detenete. Si falla algo que la tarjeta no tocó, es igual de bloqueante: avisá en el grupo, porque `main` puede estar rota.

6. **Verificar la Definición de Hecho** y presentá una tabla con evidencia concreta por fila:

   | Punto | Estado | Evidencia |
   |---|---|---|
   | Cada criterio de aceptación (una fila por criterio) | ✅ / ❌ | Test o archivo que lo demuestra |
   | Rama rebasada sobre `origin/main` | ✅ / ❌ | `git log origin/main..HEAD` |
   | Suite completa, test de humo, lint y build pasan | ✅ / ❌ | Resultado de los comandos |
   | Cobertura de `services/` (si la tarjeta es de backend) | % | Salida de `--cov` |
   | `docs/` actualizado si cambió una ruta, una regla o cómo se levanta | ✅ / ❌ / N/A | Archivo modificado |
   | Prueba de integración con `docker compose up` | ✅ / ❌ (confirmada por el usuario) | Qué se recorrió |
   | Quien entrega puede explicar el código | Pendiente de confirmación | — |

   Si algún punto está en ❌, detenete: la tarjeta no está lista. Para «puede explicar el código», ofrecé un resumen de cada archivo cambiado y las preguntas que podría hacer la cátedra sobre ellos.

7. **Preparar el pull request** con `.github/pull_request_template.md` y mostralo:

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
   - [x] Rama rebasada sobre main
   - [x] Suite completa, test de humo, lint y build en verde
   - [x] Prueba de integración con Docker Compose: <qué se recorrió>
   - [x] docs/ actualizado (o N/A)
   - [ ] Puedo explicar cada cambio en la defensa
   ```

   - Sin firmas de herramientas de IA en el cuerpo (`CLAUDE.md`).
   - `Closes #NN` hace que GitHub cierre el issue al integrar el PR.

8. **Esperar confirmación** para el push de la rama, la creación del PR y el movimiento de la tarjeta.

9. **Con la confirmación:**
   - `git push -u origin <rama>`.
   - `gh pr create --title "..." --body-file <archivo>` (escribí el cuerpo en un archivo temporal para no romper el formato).
   - Pedí revisión a alguien de la otra capa: `gh pr edit --add-reviewer <usuario>`. Equipo: FefeSaenz (frontend), santiansaa (backend), almaranteManuel y Alanv3514 (fullstack).
   - `node scripts/tablero.mjs mover NN "En revisión"`.

10. **Recordá al usuario** que espere el CI en verde y la aprobación, y que integre con **squash merge**. Si `main` avanzó mientras el PR esperaba la revisión, hay que volver a rebasar y repetir los pasos 4 y 5 antes del merge. Después del merge: `/tarjeta-cerrar NN`.
