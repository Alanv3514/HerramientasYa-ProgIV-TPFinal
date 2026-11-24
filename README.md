# Herramientas Ya

Sistema de gestión de alquiler de herramientas para prácticas de estudiantes. Proyecto final de Programación IV (UTN, Tecnicatura Universitaria en Programación, 2026).

Los estudiantes de carreras técnicas necesitan herramientas y equipos para sus trabajos prácticos (multímetros, soldadores, osciloscopios, kits de Arduino, calibres, taladros), muchas veces solo para una materia o una entrega. Otros estudiantes y egresados ya tienen esos equipos guardados y sin uso. En Herramientas Ya los publican para alquilarlos por día, y quien los necesita para una práctica los alquila a menor costo que comprarlos.

El sistema gestiona las publicaciones, las reservas por fecha, el cálculo del costo y del depósito, el recargo por atraso, las calificaciones y el registro de cada operación. El cobro y la entrega se acuerdan entre las partes por fuera de la plataforma (por ejemplo, en la facultad); no hay pasarela de pagos.

### Usuarios

- **ADMIN:** valida que quienes se registran sean estudiantes o egresados (carrera y legajo), gestiona categorías y carreras, y modera publicaciones y usuarios.
- **PROPIETARIO:** publica sus herramientas con precio por día y las carreras o materias para las que sirven, acepta o rechaza solicitudes y registra la entrega y la devolución.
- **CLIENTE:** busca herramientas disponibles para su práctica, solicita alquileres por rango de fechas y consulta su historial.

Un mismo usuario puede ser propietario y cliente. Solo los usuarios validados por el ADMIN pueden publicar o alquilar.

## Integrantes

- Federico Saenz
- Santiago Ansa
- Manuel Almarante
- Eric Alan Vinzón

## Propuesta

La propuesta enviada a la cátedra está en [`docs/propuesta.txt`](docs/propuesta.txt): problema que resuelve, usuarios, funcionalidades principales y reglas de negocio.

El detalle técnico (requisitos, reglas de negocio, modelo de datos, API, pantallas y gestión) está en [`docs/requisitos.md`](docs/requisitos.md).

## Cómo trabajamos

- Tablero: GitHub Project «Herramientas Ya». Cada tarjeta es un issue; la guía está fijada en el issue #1 y en [`docs/gestion/como-trabajamos.md`](docs/gestion/como-trabajamos.md).
- Claude Code: [`CLAUDE.md`](CLAUDE.md) y las skills de [`.claude/skills/`](.claude/skills/). Hay una por cada tecnología que dio la cátedra y otras para el ciclo de cada tarjeta.

## Tecnologías

- **Backend:** FastAPI, SQLModel, autenticación con JWT, roles y permisos, tests con pytest.
- **Frontend:** React, TypeScript y Vite.
