import { apiFetch } from './client'
import type { HealthResponse } from './types'

export const getHealth = () => apiFetch<HealthResponse>('/health')
