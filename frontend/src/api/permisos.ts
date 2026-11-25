// Espejo de backend/model/permisos.py: si cambia allá, cambia acá.
// Son constantes y no strings sueltos para que TypeScript detecte un error de tipeo.
export const P = {
  VER_USUARIOS: 'ver_usuarios',
  VALIDAR_USUARIOS: 'validar_usuarios',
  GESTIONAR_CATEGORIAS: 'gestionar_categorias',
  GESTIONAR_CARRERAS: 'gestionar_carreras',
  MODERAR_HERRAMIENTAS: 'moderar_herramientas',
  PUBLICAR_HERRAMIENTAS: 'publicar_herramientas',
  GESTIONAR_SOLICITUDES: 'gestionar_solicitudes',
  SOLICITAR_ALQUILERES: 'solicitar_alquileres',
  CALIFICAR: 'calificar',
} as const

export type Permiso = (typeof P)[keyof typeof P]
