---
name: tarjeta-nueva
description: Crea una tarjeta nueva (issue) a partir de la plantilla del equipo y la suma al Backlog del GitHub Project "Herramientas Ya", con sus campos. Usala cuando aparezca un bug, una mejora o una tarea fuera del alcance de la tarjeta actual ("Posible tarjeta nueva"), o cuando haya que dividir una tarjeta grande.
disable-model-invocation: true
argument-hint: "[título o descripción breve]"
allowed-tools: Bash(gh issue list *) Bash(gh issue view *) Bash(node scripts/tablero.mjs *)
---

# Nueva tarjeta: $ARGUMENTS

## Pasos

1. **Evitar duplicados.** Buscá si ya existe una tarjeta parecida: `gh issue list --state all --search "<palabras clave>"`. Si existe, mostrala y preguntá si alcanza con comentar en ella.

2. **Leer la plantilla** en `.github/ISSUE_TEMPLATE/tarjeta.md` (es la misma que el issue fijado «PLANTILLA», #2) y las reglas de `docs/gestion/como-trabajamos.md` (campos y valores posibles).

3. **Completar la plantilla** a partir de lo que pidió el usuario y de `docs/requisitos.md`:
   - **Título:** `[Área] Verbo + qué`, por ejemplo `[Backend] Validar el tamaño de las fotos`.
   - **Área, Módulo, Prioridad, Talle e Iteración**, con los valores de la guía. Si es más grande que L, proponé dividirla en varias.
   - **Responsable sugerido**, según las preferencias del equipo:
     - Federico Saenz: frontend y UX/UI;
     - Santiago Ansa: backend;
     - Manuel Almarante y Alan Vinzón: fullstack.
   - **Depende de:** los issues que tienen que estar en Hecho antes, con `#NN`, o «ninguna».
   - **Referencias** a `RF`, `RN` y `RNF`. Si la tarea no está cubierta por los requisitos, decilo: puede que primero haya que actualizar `docs/requisitos.md`.
   - **Skills** de tecnología que aplican.
   - **Criterios de aceptación** verificables, cada uno demostrable con un test o una prueba manual concreta.

4. **Mostrar la tarjeta completa y esperar confirmación.** Crear un issue notifica al equipo.

5. **Con la confirmación:**
   - Escribí el cuerpo en un archivo temporal y creá el issue: `gh issue create --title "..." --body-file <archivo> --label <área en minúsculas>`.
   - Sumala al tablero: `node scripts/tablero.mjs agregar NN`.
   - Cargá los campos: `node scripts/tablero.mjs campo NN Status Backlog`, y lo mismo para `Área`, `Módulo`, `Prioridad`, `Talle` e `Iteración`.
   - Mostrá el enlace al issue.
