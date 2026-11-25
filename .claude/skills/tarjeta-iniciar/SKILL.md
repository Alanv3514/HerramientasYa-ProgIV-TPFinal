---
name: tarjeta-iniciar
description: Inicia el trabajo sobre una tarjeta (issue) del GitHub Project "Herramientas Ya". Valida la tarjeta y sus dependencias, crea la rama de Git, la mueve a En curso y propone un plan antes de escribir código.
disable-model-invocation: true
argument-hint: "[NN]"
allowed-tools: Bash(git status *) Bash(git branch *) Bash(git fetch *) Bash(git pull *) Bash(git switch *) Bash(node scripts/tablero.mjs *) Bash(gh issue view *) Bash(gh issue edit *) Bash(gh api user *)
---

# Iniciar la tarjeta #$0

## Estado actual del repositorio

- Rama actual: !`git branch --show-current`
- Cambios sin commitear:
!`git status --short`

## Pasos

Seguí estos pasos en orden. No escribas código de la aplicación en esta skill.

1. **Árbol de trabajo limpio.** Si hay cambios sin commitear, detenete y avisá. Proponé usar `/tarjeta-commit` o guardarlos (`git stash`) antes de seguir.

2. **Leer «Cómo trabajamos».** Leé `docs/gestion/como-trabajamos.md` entero: sus reglas valen para esta tarjeta igual que `CLAUDE.md`. Si alguna contradice lo que dice esta skill, avisá cuál.

3. **Obtener la tarjeta.** Corré `node scripts/tablero.mjs ver $0`. Muestra:
   - título, columna (`Status`), campos, responsables y etiquetas;
   - el estado de cada dependencia;
   - el cuerpo del issue con los criterios de aceptación.

   Si el script falla por permisos, indicá `gh auth refresh -s project`. Mientras tanto, seguí con `gh issue view $0`.

4. **Validar el estado de la tarjeta.**
   - **Backlog:** no está refinada. Si no tiene criterios de aceptación, talle o dependencias, avisá y preguntá si refinarla ahora (completar el cuerpo con `gh issue edit`) o elegir otra.
   - **Etiqueta `bloqueada`:** avisá el motivo (último comentario) y no sigas sin confirmación.
   - **Ya en curso, en revisión o hecha:** avisá y preguntá.
   - **Límite por persona:** corré `node scripts/tablero.mjs en-curso`. Si ya tenés 2 en curso, avisá que se supera el límite y preguntá si seguir.
   - **Responsable:** si la tarjeta está asignada a otra persona, avisá antes de tomarla.

5. **Validar dependencias** según la regla 3 de «Cómo trabajamos». Para cada «Depende de» que no esté en Hecho, decí cuál es, en qué columna está y quién la tiene:
   - **Del esqueleto (#3, #4, #5):** bloquea. No sigas sin confirmación.
   - **De otra persona:** no bloquea el inicio. En el plan (paso 7), separá:
     - qué parte se hace ya contra el contrato de `docs/requisitos.md` §6 y §7;
     - qué parte se integra cuando la dependencia llegue a `main`.
     
     La tarjeta no se entrega hasta que la dependencia esté en Hecho.
   - **Tuya:** terminala primero.

6. **Leer los requisitos.** Abrí `docs/requisitos.md` y leé solo las secciones que referencia la tarjeta (`RF-xx`, `RN-xx`, `RNF-xx`, la sección 7 de la API y la 6 del modelo si aplica). Si algo referenciado figura en la sección 11 («Supuestos a confirmar»), avisalo.

7. **Proponer rama y plan.** Presentá en un solo mensaje:
   - Nombre de rama: `tipo/$0-descripcion-corta` (tipo según la tarea: feat, fix, refactor, test, docs, chore).
   - Qué skill de tecnología vas a seguir (`/fastapi-sqlmodel`, `/react-frontend`, etc.) y el plan en pasos cortos, en el orden que marca esa skill, con los archivos que probablemente toque.
   - Qué test (o prueba manual) cubre cada criterio de aceptación.
   - Riesgos o ambigüedades de los requisitos.
   - Si el trabajo parece más grande que el talle de la tarjeta, proponé dividirla (`/tarjeta-nueva`).

   Terminá preguntando: «¿Confirmo la rama y muevo la tarjeta a En curso?»

8. **Con la confirmación:**
   - `git switch main`, `git pull`, `git switch -c <rama>`. La rama sale siempre de `main` actualizada, nunca de la rama de otra tarjeta.
   - `node scripts/tablero.mjs mover $0 "En curso"`.
   - Si la tarjeta no tiene responsable, asignátela: `gh issue edit $0 --add-assignee @me`.

9. **No empieces a implementar** hasta que el usuario apruebe el plan explícitamente.
