// El único lugar del frontend con fetch: URL base, token, errores y 401 (paso 8 de la guía).
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
  // Con FormData (fotos, RF-08) el navegador pone el Content-Type con el boundary.
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
