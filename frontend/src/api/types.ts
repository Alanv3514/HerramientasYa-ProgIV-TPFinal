// Tipos de la API, copiados de backend/api/model/. Cada tarjeta suma los de sus endpoints,
// con un comentario que diga de qué endpoint salen. Los montos llegan como string ("1500.00")
// porque en el backend son Decimal.

// GET /health
export interface HealthResponse {
  status: string
}

// Respuesta de los POST y PATCH que crean o modifican un recurso.
export interface CreatedResponse {
  id: number
}
