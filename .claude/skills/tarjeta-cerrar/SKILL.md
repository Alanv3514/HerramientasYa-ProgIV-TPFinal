---
name: tarjeta-cerrar
description: Cierra una tarjeta después de integrar su pull request. Actualiza main, borra la rama local, registra las horas reales en el issue, la pasa a Hecho en el GitHub Project y sugiere la siguiente.
disable-model-invocation: true
argument-hint: "[NN]"
allowed-tools: Bash(git status *) Bash(git branch *) Bash(git fetch *) Bash(git pull *) Bash(git switch *) Bash(git log *) Bash(node scripts/tablero.mjs *) Bash(gh pr view *) Bash(gh pr list *) Bash(gh issue view *)
---

# Cerrar la tarjeta $ARGUMENTS

## Estado actual

- Rama: !`git branch --show-current`
- Cambios sin commitear:
!`git status --short`

## Pasos

1. **Identificar la tarjeta.** Usá el número pasado como argumento. Si no hay, sacalo del nombre de la rama actual (`tipo/NN-...`).

2. **Verificar que el PR está integrado.** `gh pr list --state merged --search "NN in:title"` o `gh pr view <rama> --json state,mergedAt,url`. Si el PR no está integrado, detenete.

3. **Limpiar Git.**
   - `git switch main` y `git pull`.
   - Verificá con `git log --oneline -5` que el commit de la tarjeta está en `main` (squash merge: un solo commit con `(#NN)` en el título).
   - Borrá la rama local con `git branch -d <rama>`. Con squash merge, Git a veces dice que la rama «no está integrada» aunque lo esté. Si pasa, mostrá el PR integrado como evidencia y pedí confirmación antes de usar `-D`. No fuerces el borrado sin esa confirmación.

4. **Registrar el tiempo real.** Preguntá: «¿Cuántas horas reales llevó la tarjeta NN?». Leé el talle estimado con `node scripts/tablero.mjs ver NN`.

5. **Actualizar el tablero**, después de mostrar el texto y recibir confirmación:
   - Comentario en el issue: `gh issue comment NN --body "Cerrada. Talle estimado: X. Horas reales: Y. PR: <enlace>"`.
   - `node scripts/tablero.mjs mover NN "Hecho"`. Si el issue ya se cerró por el `Closes #NN` y el Project lo movió solo, no hace falta.
   - Si alguna tarjeta con la etiqueta `bloqueada` dependía de esta, avisá que ya puede desbloquearse (`gh issue edit <otra> --remove-label bloqueada`).

6. **Sugerir la siguiente.** `node scripts/tablero.mjs siguiente` lista las tarjetas de «Para hacer» asignadas a vos o sin asignar, ordenadas por dependencias resueltas y prioridad. Recomendá la primera sin dependencias pendientes. Si «Para hacer» está vacía, recordá refinar: pasar tarjetas del Backlog completando sus criterios de aceptación.

7. **Si la tarjeta es la última de su iteración**, recordá:
   - revisar la iteración en grupo (qué salió, qué se atrasó, cuántas horas reales contra el talle);
   - crear el tag en `main`: `v0.1.0` al terminar la iteración 1, `v0.2.0` la 2 y `v1.0.0` la versión para la mesa.
