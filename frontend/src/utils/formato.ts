// Fechas y montos se formatean solo acá, para que se vean igual en todas las pantallas.

// "2026-12-05" o "2026-12-05T10:30:00" → "05/12/2026".
// Se arma a mano desde el texto: new Date("2026-12-05") lo toma como UTC y en Argentina daría el día anterior.
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

// "1500.00" (un Decimal del backend) → "$ 1.500,00".
export function formatearMonto(monto: string | number): string {
  return Number(monto).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
}
