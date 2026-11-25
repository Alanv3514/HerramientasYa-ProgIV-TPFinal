# Código base del frontend

Adaptado del repo `utn-tup-2026-frontend` de la cátedra, que es la solución de la guía de React. Los comentarios marcan qué cambia respecto del original.

Contenido:

1. [Estructura](#estructura)
2. [api/client.ts](#apiclientts)
3. [api/permisos.ts y un recurso](#apipermisosts-y-un-recurso)
4. [hooks/useFetch.ts](#hooksusefetchts)
5. [context/](#context)
6. [Rutas: App.tsx, ProtectedRoute y Layout](#rutas-apptsx-protectedroute-y-layout)
7. [Componentes chicos](#componentes-chicos)
8. [Una pantalla completa](#una-pantalla-completa)

## Estructura

```
frontend/src/
├── api/            acceso a datos (paso 8)
│   ├── client.ts       apiFetch y ApiError: el único fetch
│   ├── types.ts        tipos de la API
│   ├── permisos.ts     constantes de permisos, espejo de model/permisos.py
│   ├── auth.ts         login y registro
│   ├── herramientas.ts, alquileres.ts, categorias.ts, ...
├── context/        estado global (paso 9)
│   ├── useAuth.ts      qué ofrece la sesión y useAuth()
│   └── AuthContext.tsx cómo se arma la sesión
├── hooks/          lógica reutilizable (paso 10)
│   └── useFetch.ts
├── components/     piezas reutilizables
│   ├── ProtectedRoute.tsx, Layout.tsx, ErrorMessage.tsx, ConfirmButton.tsx
├── pages/          una pantalla por ruta
├── utils/formato.ts  fechas y montos
└── App.tsx         qué pantalla va en cada URL
```

## api/client.ts

Igual al de la cátedra, más el soporte de `FormData` para las fotos:

```ts
const API_URL = import.meta.env.VITE_API_URL

// Un error con el código HTTP: cada pantalla decide qué hacer (403, 409...).
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

// Qué hacer cuando el token deja de servir. Lo define AuthContext.
let onUnauthorized = () => {}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

// Saca un mensaje legible del cuerpo de error de FastAPI.
function readDetail(text: string, status: number): string {
  try {
    const { detail } = JSON.parse(text)
    if (typeof detail === 'string') return detail
    // 422 de validación: {"detail": [{"loc": ["body", "precio_dia"], "msg": "..."}]}
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc.at(-1)}: ${e.msg}`).join(' · ')
    }
  } catch {
    // La respuesta no era JSON: por ejemplo "Internal Server Error".
  }
  return text || `Error ${status}`
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  // Nuevo: con FormData (fotos) el navegador pone el Content-Type con el boundary.
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined
        : isForm ? (options.body as FormData)
        : JSON.stringify(options.body),
    })
  } catch {
    // fetch solo falla si no hubo respuesta: API apagada, o un 500 sin headers CORS.
    throw new ApiError(0, 'No se pudo conectar con el servidor. Probá de nuevo en un momento.')
  }

  const text = await response.text()
  if (!response.ok) {
    // Con token, un 401 es una sesión vencida. Sin token, es un login fallido.
    if (response.status === 401 && token) onUnauthorized()
    throw new ApiError(response.status, readDetail(text, response.status))
  }
  return (text ? JSON.parse(text) : null) as T
}
```

## api/permisos.ts y un recurso

```ts
// Espejo de backend/model/permisos.py: si cambia allá, cambia acá.
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
```

`api/herramientas.ts`: una función por endpoint, como `api/users.ts` de la cátedra.

```ts
import { apiFetch } from './client'
import type { CreatedResponse, HerramientaDetalle, HerramientaPayload, HerramientaResumen } from './types'

export interface FiltrosCatalogo {
  q?: string
  categoria?: number
  carrera?: number
  min?: string
  max?: string
  desde?: string // aaaa-mm-dd
  hasta?: string
  offset: number
  limit: number
}

// URLSearchParams codifica cada valor: es el encodeURIComponent de la práctica 3.
export const getCatalogo = (filtros: FiltrosCatalogo) => {
  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') params.set(clave, String(valor))
  }
  return apiFetch<HerramientaResumen[]>(`/herramientas?${params}`)
}

export const getHerramienta = (id: number) => apiFetch<HerramientaDetalle>(`/herramientas/${id}`)

export const createHerramienta = (h: HerramientaPayload) =>
  apiFetch<CreatedResponse>('/herramientas', { method: 'POST', body: h })

export const updateHerramienta = (id: number, h: HerramientaPayload) =>
  apiFetch<CreatedResponse>(`/herramientas/${id}`, { method: 'PATCH', body: h })

export const subirFoto = (id: number, archivo: File) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return apiFetch<CreatedResponse>(`/herramientas/${id}/fotos`, { method: 'POST', body: form })
}
```

## hooks/useFetch.ts

Sin cambios respecto de la cátedra:

```ts
/* eslint-disable react-hooks/exhaustive-deps */
// Las dependencias las pasa quien llama, como en useEffect. El linter no puede
// verificarlas desde acá, por eso se apaga esa regla en este archivo.
import { useCallback, useEffect, useState } from 'react'
import type { DependencyList } from 'react'

// Los tres estados de cualquier pedido a la API: cargando, error y datos.
export function useFetch<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0) // subirlo = volver a pedir

  useEffect(() => {
    // Si las dependencias cambian antes de que llegue la respuesta, esa respuesta ya no sirve.
    let ignore = false
    setLoading(true)
    setError(null)
    fetcher()
      .then((result) => { if (!ignore) setData(result) })
      .catch((e: Error) => { if (!ignore) setError(e.message) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data, error, loading, reload }
}
```

## context/

`useAuth.ts`, el mismo contrato que la cátedra:

```ts
import { createContext, useContext } from 'react'
import type { Permiso } from '../api/permisos'
import type { Me } from '../api/types'

export interface AuthContextValue {
  user: Me | null
  permissions: string[]
  isAuthenticated: boolean
  loadingSession: boolean
  sessionMessage: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
  can: (permission: Permiso) => boolean
  showAllButtons: boolean                     // paso 12: para demostrar que el backend protege
  setShowAllButtons: (value: boolean) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth se usa dentro de <AuthProvider>')
  return context
}
```

`AuthContext.tsx`: el de la cátedra, con `fetchSession` en un solo pedido.

```tsx
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import type { Permiso } from '../api/permisos'
import type { Me } from '../api/types'
import { getMe } from '../api/usuarios'
import { AuthContext } from './useAuth'

// El JWT solo trae el email. Quién soy y qué puedo hacer se le pide a la API.
// Cambio respecto de la cátedra: GET /me ya trae roles y permisos (1 pedido en lugar de 2 + N).
async function fetchSession() {
  const user = await getMe()
  return { user, permissions: user.permisos }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState<Me | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [showAllButtons, setShowAllButtons] = useState(false)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setPermissions([])
    setShowAllButtons(false)
  }, [])

  // apiFetch llama a esto cuando la API responde 401 con un token.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      setSessionMessage('Tu sesión venció. Volvé a ingresar.')
    })
  }, [logout])

  // Corre al iniciar sesión y al recargar la página con un token guardado.
  useEffect(() => {
    if (!token) return
    fetchSession()
      .then((session) => {
        setUser(session.user)
        setPermissions(session.permissions)
      })
      .catch((e: Error) => {
        logout()
        setSessionMessage((current) => current ?? e.message)
      })
  }, [token, logout])

  async function login(email: string, password: string) {
    setSessionMessage(null)
    const { token: newToken } = await authApi.login(email, password)
    localStorage.setItem('token', newToken)
    setToken(newToken) // cambia el token → corre el useEffect de arriba
  }

  // Después de sumar un rol en el perfil (RF-03), se vuelven a pedir los permisos.
  async function refreshSession() {
    const session = await fetchSession()
    setUser(session.user)
    setPermissions(session.permissions)
  }

  const value = {
    user,
    permissions,
    isAuthenticated: token !== null,
    loadingSession: token !== null && user === null,
    sessionMessage,
    login,
    logout,
    refreshSession,
    can: (permission: Permiso) => showAllButtons || permissions.includes(permission),
    showAllButtons,
    setShowAllButtons,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

## Rutas: App.tsx, ProtectedRoute y Layout

```tsx
// App.tsx
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route element={<Layout />}>
            {/* públicas, con menú */}
            <Route path="/herramientas" element={<CatalogoPage />} />
            <Route path="/herramientas/:id" element={<HerramientaDetallePage />} />
            {/* privadas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/mis-herramientas" element={<MisHerramientasPage />} />
              <Route path="/mis-alquileres" element={<MisAlquileresPage />} />
              <Route path="/solicitudes" element={<SolicitudesPage />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/herramientas" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

Cambio respecto de la cátedra: el catálogo es público (`RF-12`), así que `Layout` va por fuera de `ProtectedRoute` y muestra "Ingresar" o "Salir" según la sesión.

`ProtectedRoute.tsx`, igual al de la cátedra:

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// Envuelve las rutas privadas: sin token, al login.
export function ProtectedRoute() {
  const { isAuthenticated, loadingSession } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (loadingSession) return <p>Cargando sesión…</p>
  return <Outlet /> // acá se dibuja la ruta hija
}
```

En `Layout.tsx`, cada link del menú también va dentro de `can()`: "Mis herramientas" solo con `P.PUBLICAR_HERRAMIENTAS`, y "Administración" solo con `P.VALIDAR_USUARIOS`. El check "Mostrar todos los botones" del paso 12 queda solo en desarrollo (`import.meta.env.DEV`): en la mesa sirve para mostrar el 403.

## Componentes chicos

```tsx
// ErrorMessage.tsx: role="alert" hace que el lector de pantalla lo anuncie.
export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null
  return <p role="alert" className="error">{message}</p>
}
```

```tsx
// ConfirmButton.tsx: pide un segundo clic antes de una acción que no se puede deshacer (RNF-11).
import { useState } from 'react'

interface Props {
  label: string
  onConfirm: () => void
}

export function ConfirmButton({ label, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return <button type="button" onClick={() => setConfirming(true)}>{label}</button>
  }
  return (
    <>
      <button type="button" className="danger" onClick={onConfirm}>Confirmar</button>
      <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
    </>
  )
}
```

## Una pantalla completa

`pages/SolicitudesPage.tsx`: lista, filtro, acciones con permiso y propiedad, y recarga. Tiene la forma de `UsersPage` de la cátedra.

```tsx
import { useState } from 'react'
import { cambiarEstado, getAlquileres } from '../api/alquileres'
import { P } from '../api/permisos'
import type { EstadoAlquiler } from '../api/types'
import { ConfirmButton } from '../components/ConfirmButton'
import { ErrorMessage } from '../components/ErrorMessage'
import { useAuth } from '../context/useAuth'
import { useFetch } from '../hooks/useFetch'
import { formatearFecha, formatearMonto } from '../utils/formato'

const PAGE_SIZE = 20

export function SolicitudesPage() {
  const { can } = useAuth()
  const [estado, setEstado] = useState<EstadoAlquiler | ''>('SOLICITADO')
  const [offset, setOffset] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)

  // Un solo pedido que depende de los filtros: si cambia uno, se pide de nuevo.
  const { data: alquileres, error, loading, reload } = useFetch(
    () => getAlquileres({ como: 'propietario', estado, offset, limit: PAGE_SIZE }),
    [estado, offset],
  )

  async function accion(id: number, transicion: 'confirmar' | 'rechazar' | 'entregar' | 'devolver') {
    setActionError(null)
    try {
      await cambiarEstado(id, transicion)
      reload() // vuelve a pedir la lista con el estado nuevo
    } catch (e) {
      setActionError((e as Error).message) // por ejemplo, 409 si se superpone (RN-04)
    }
  }

  return (
    <>
      <h1>Solicitudes recibidas</h1>
      <label htmlFor="filtro-estado">Estado</label>
      <select id="filtro-estado" value={estado}
        onChange={(e) => { setOffset(0); setEstado(e.target.value as EstadoAlquiler | '') }}>
        <option value="">Todos</option>
        <option value="SOLICITADO">Pendientes</option>
        <option value="CONFIRMADO">Confirmados</option>
        <option value="EN_CURSO">En curso</option>
        <option value="FINALIZADO">Finalizados</option>
      </select>

      <ErrorMessage message={error ?? actionError} />
      {loading && <p>Cargando…</p>}
      {alquileres?.length === 0 && <p>No tenés solicitudes con ese estado.</p>}

      <ul className="lista-tarjetas">
        {alquileres?.map((a) => (
          <li key={a.id} className="card">
            <h2>{a.herramienta.nombre}</h2>
            <p>{a.cliente.nombre} · ★ {a.cliente.reputacion ?? 'sin calificaciones'}</p>
            <p>{formatearFecha(a.fecha_inicio)} al {formatearFecha(a.fecha_fin)} · {formatearMonto(a.costo)}</p>
            {/* El backend pide gestionar_solicitudes Y que la herramienta sea mía:
                acá ya vienen solo las mías (como=propietario). */}
            {can(P.GESTIONAR_SOLICITUDES) && a.estado === 'SOLICITADO' && (
              <>
                <button type="button" onClick={() => accion(a.id, 'confirmar')}>Confirmar</button>
                <ConfirmButton label="Rechazar" onConfirm={() => accion(a.id, 'rechazar')} />
              </>
            )}
            {can(P.GESTIONAR_SOLICITUDES) && a.estado === 'CONFIRMADO' && (
              <button type="button" onClick={() => accion(a.id, 'entregar')}>Registrar entrega</button>
            )}
            {can(P.GESTIONAR_SOLICITUDES) && a.estado === 'EN_CURSO' && (
              <button type="button" onClick={() => accion(a.id, 'devolver')}>Registrar devolución</button>
            )}
          </li>
        ))}
      </ul>

      <div className="row">
        <button type="button" disabled={offset === 0} onClick={() => setOffset(offset - PAGE_SIZE)}>Anterior</button>
        <button type="button" disabled={(alquileres?.length ?? 0) < PAGE_SIZE}
          onClick={() => setOffset(offset + PAGE_SIZE)}>Siguiente</button>
      </div>
    </>
  )
}
```
