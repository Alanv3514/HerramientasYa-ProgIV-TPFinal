---
name: tarjeta-commit
description: Revisa los cambios pendientes de la tarjeta en curso y propone uno o más commits con formato Conventional Commits y referencias al issue y a los requisitos.
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git add *) Bash(git commit *) Bash(git branch *) Bash(git log *)
---

# Commit de la tarjeta en curso

## Estado actual

- Rama: !`git branch --show-current`
- Archivos modificados:
!`git status --short`
- Resumen del diff:
!`git diff HEAD --stat`

## Pasos

1. **Validar la rama.** Si la rama es `main`, detenete: no se commitea en `main`. Proponé crear la rama con `/tarjeta-iniciar NN`. Sacá el número de tarjeta (NN) del nombre de la rama (`tipo/NN-...`).

2. **Revisar el diff completo** (`git diff HEAD`, y los archivos nuevos sin seguimiento) y buscá:
   - **Secretos:** credenciales, tokens, contraseñas o archivos `.env`. Solo se commitea `.env.example`, y sin valores reales.
   - **Depuración olvidada:** `print(`, `console.log`, `debugger`, código comentado.
   - **Cambios ajenos a la tarjeta.**
   - **Backend:**
     - una ruta privada sin `@protected` o sin `permission_check`;
     - permisos escritos como strings sueltos en lugar de las constantes de `model/permisos.py`;
     - reglas de negocio en el router, o `select` y `HTTPException` fuera de su capa (ver `/fastapi-sqlmodel`);
     - montos como `float`;
     - una acción sobre un recurso con dueño sin verificar la propiedad (`RNF-03`).
   - **Frontend:**
     - `fetch(` fuera de `api/client.ts`;
     - botones de acción sin `can()`;
     - inputs sin `label` (ver `/react-frontend`).
   - **Tests:** cambios de comportamiento sin un test que los cubra.
   - **Archivos que no van:** `database.db`, `node_modules/`, `dist/`, `__pycache__/`, `.venv/`, fotos subidas.

   Reportá cada hallazgo. Si hay algo bloqueante (secretos, ruta sin protección, archivos que no van), no propongas el commit hasta que se resuelva.

3. **Agrupar por intención.** Si el diff mezcla intenciones (un refactor y una funcionalidad, o backend y frontend independientes), proponé separarlo en varios commits e indicá qué archivos van en cada uno.

4. **Proponer el mensaje** de cada commit:

   ```
   tipo(módulo): descripción en presente, en minúsculas, sin punto final

   Por qué, si no es obvio.

   Refs: #NN, RF-xx
   ```

   - El módulo es el de la tarjeta, en minúsculas: `alquileres`, `herramientas`, `auth`, `infra`.
   - **No agregues líneas `Co-Authored-By` ni firmas de herramientas de IA.** Es una regla del equipo (`CLAUDE.md`).

5. **Esperar confirmación.** Mostrá los archivos y el mensaje de cada commit, y preguntá si confirmar.

6. **Con la confirmación:** agregá solo los archivos de cada commit por nombre (no uses `git add .` ni `git add -A`) y ejecutá el commit. Después mostrá `git log --oneline -3`.
