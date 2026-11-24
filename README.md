# Herramientas Ya

Sistema de gestión de alquiler de herramientas para prácticas de estudiantes. Proyecto final de Programación IV (UTN, Tecnicatura Universitaria en Programación, 2026).

Estudiantes y egresados publican las herramientas y equipos que ya no usan (multímetros, soldadores, osciloscopios, kits de Arduino, calibres) para alquilarlos por día, y quien los necesita para un trabajo práctico los alquila a menor costo que comprarlos. El sistema gestiona las publicaciones, las reservas por fecha, el cálculo del costo y el registro de cada operación.

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
