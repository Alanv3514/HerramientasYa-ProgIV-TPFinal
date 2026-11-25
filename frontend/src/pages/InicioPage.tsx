import { getHealth } from '../api/health'
import { ErrorMessage } from '../components/ErrorMessage'
import { useFetch } from '../hooks/useFetch'

// Pantalla provisoria: confirma que el frontend llega a la API (apiFetch + CORS).
// La reemplaza el catálogo cuando esté.
export function InicioPage() {
  const { data, error, loading } = useFetch(getHealth, [])

  return (
    <main>
      <h1>Herramientas Ya</h1>
      {loading && <p>Cargando…</p>}
      <ErrorMessage message={error} />
      {data && <p>API conectada.</p>}
    </main>
  )
}
