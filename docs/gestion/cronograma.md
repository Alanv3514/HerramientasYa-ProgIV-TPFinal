# Cronograma

Plan para terminar el código el **11/12**, estudiar y ensayar del **12 al 15/12** y presentar el **16/12**. Cada fila del Gantt es una persona; las barras que se superponen entre filas son trabajo en paralelo.

- **En rojo:** el esqueleto (#3, #4, #5). Es lo único que bloquea el inicio de otras tarjetas, y en GitHub está marcado como *blocked by*.
- **En otro color:** prioridad Media o Baja. Es lo primero que se recorta si hay atraso.
- **El resto de las dependencias no bloquea:** se arranca contra el contrato de `docs/requisitos.md` §6 y §7, y solo hace falta que la otra tarjeta esté en Hecho para entregar (regla 3 de [Cómo trabajamos](como-trabajamos.md)).

La planificación supone unas 3,5 h por día por persona, fines de semana incluidos, y unas 4,5 h para Alan. Los talles se cuentan como S = 2 h, M = 4 h y L = 7 h. Todos terminan el 10/12, así que queda un día de margen.

```mermaid
gantt
    title Herramientas Ya: código hasta el 11/12, presentación el 16/12
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    tickInterval 2day
    todayMarker on

    section Alan
    3 Armar la estructura del monorepo :crit, t3, 2026-11-25, 2026-11-26
    4 Esqueleto del backend en capas con conexión a la base :crit, t4, 2026-11-25, 2026-11-27
    5 Proyecto Vite con React, TypeScript, React Router y apiFetch :crit, t5, 2026-11-26, 2026-11-28
    6 Docker Compose con PostgreSQL, API y frontend :t6, 2026-11-27, 2026-11-29
    7 CI en GitHub Actions tests, cobertura, lint y build :t7, 2026-11-28, 2026-11-29
    8 Proteger main pull request obligatorio, CI en verde y una revisión :t8, 2026-11-29, 2026-11-30
    14 Base de tests conftest con un usuario por rol :t14, 2026-11-29, 2026-11-30
    16 Sesión AuthContext, rutas protegidas y menú :t16, 2026-11-29, 2026-12-01
    32 Solicitar un alquiler desde el detalle :t32, 2026-12-03, 2026-12-06
    28 Calificaciones y reputación :t28, 2026-12-05, 2026-12-07
    33 Solicitudes recibidas confirmar, rechazar, entregar y devolver :t33, 2026-12-06, 2026-12-08
    34 Mis alquileres estado, cancelar y calificar :t34, 2026-12-07, 2026-12-09
    48 Datos de demo para la mesa :t48, 2026-12-08, 2026-12-10
    35 Historial e ingresos o gastos :active, t35, 2026-12-09, 2026-12-11
    49 README final y documentación de la entrega :t49, 2026-12-09, 2026-12-10

    section Santi
    9 Modelo de usuarios, roles y permisos con su seed :t9, 2026-11-26, 2026-11-28
    11 Login con JWT y protección de rutas :t11, 2026-11-27, 2026-11-29
    12 Registro de usuarios :t12, 2026-11-28, 2026-11-30
    13 Mi perfil GET /me con roles y permisos, y PATCH /me :t13, 2026-11-29, 2026-12-01
    22 Reglas de fechas y costos de alquiler como funciones puras :t22, 2026-11-30, 2026-12-03
    23 Solicitar un alquiler :t23, 2026-12-02, 2026-12-04
    24 Ciclo de vida confirmar, rechazar, entregar y cancelar :t24, 2026-12-03, 2026-12-06
    25 Devolución con recargo por atraso :t25, 2026-12-05, 2026-12-07
    26 Listado de mis alquileres :t26, 2026-12-06, 2026-12-07
    39 Validar y suspender usuarios :t39, 2026-12-06, 2026-12-09
    44 Seguridad CORS, límite de intentos de login y revisión de rutas :t44, 2026-12-08, 2026-12-09
    46 Cobertura de tests de 70 % o más en services :t46, 2026-12-08, 2026-12-10
    45 Revisión de rendimiento índices, N+1 y paginación :active, t45, 2026-12-09, 2026-12-11

    section Manuel
    10 Carreras modelo, seed y ABM del ADMIN :t10, 2026-11-26, 2026-11-28
    18 ABM de categorías :t18, 2026-11-27, 2026-11-29
    19 Publicar y editar herramientas :t19, 2026-11-28, 2026-12-01
    20 Catálogo con filtros y paginación :t20, 2026-11-30, 2026-12-03
    21 Detalle de herramienta y mis herramientas :t21, 2026-12-02, 2026-12-04
    27 Disponibilidad fechas ocupadas, filtro por fechas y RN-11 :t27, 2026-12-03, 2026-12-06
    40 Moderación de publicaciones :t40, 2026-12-05, 2026-12-06
    42 Fotos de herramientas subida validada :active, t42, 2026-12-05, 2026-12-08
    41 Panel de administración :t41, 2026-12-07, 2026-12-10
    43 Fotos en mis herramientas, catálogo y detalle :active, t43, 2026-12-09, 2026-12-11

    section Fefe
    15 Diseño base estilos, layout responsive y componentes :t15, 2026-11-27, 2026-11-29
    17 Pantallas de ingreso y registro :t17, 2026-11-29, 2026-12-02
    29 Catálogo con filtros y paginación :t29, 2026-12-01, 2026-12-04
    30 Detalle de herramienta :t30, 2026-12-03, 2026-12-05
    31 Mis herramientas publicar, editar y cambiar estado :t31, 2026-12-04, 2026-12-07
    36 Perfil y reputación :active, t36, 2026-12-06, 2026-12-08
    37 Mostrar la reputación en catálogo, detalle y solicitudes :active, t37, 2026-12-07, 2026-12-08
    47 Revisión de usabilidad, accesibilidad y responsive :t47, 2026-12-07, 2026-12-10
    38 Historial e ingresos :active, t38, 2026-12-09, 2026-12-11

    section Equipo
    Código terminado :milestone, m1, 2026-12-11, 0d
    50 Estudiar y ensayar la defensa :t50, 2026-12-12, 2026-12-16
    Presentación :milestone, m2, 2026-12-16, 0d
```

## Fuente de verdad

Las fechas viven en los campos **Inicio** y **Fin** del Project, que se ven en la vista «Cronograma (Gantt)». Este archivo es una foto del plan al 24/11. Si una tarjeta se atrasa:

1. Se corrige su Fin en el Project.
2. Se avisa en el grupo, porque puede correr las fechas de otras tarjetas.
