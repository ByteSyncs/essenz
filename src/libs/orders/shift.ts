export interface ShiftState {
  id: string
  startedAt: string
  count: number
  cashRegisterStatus: 'open' | 'closed' | 'unconfigured' | 'unavailable'
}

export function parseShiftResponse(body: unknown): ShiftState | null {
  const data = (body as { data?: Record<string, unknown> } | null)?.data
  if (!data || typeof data.id !== 'string' || typeof data.startedAt !== 'string') return null
  const count = Number(data.count)
  const status = data.cashRegisterStatus
  return {
    id: data.id,
    startedAt: data.startedAt,
    count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
    cashRegisterStatus:
      status === 'open' || status === 'closed' || status === 'unconfigured'
        ? status
        : 'unavailable',
  }
}

export function splitByShift<T extends { created_at: string }>(
  orders: T[],
  startedAt: string | null,
  isNew: (order: T) => boolean = () => false,
) {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  if (!startedAt) return { previous: [] as T[], current: sorted }

  const boundary = new Date(startedAt).getTime()
  const previous: T[] = []
  const current: T[] = []

  for (const order of sorted) {
    if (isNew(order) || new Date(order.created_at).getTime() >= boundary) current.push(order)
    else previous.push(order)
  }

  return { previous, current }
}

export function commandsLabel(count: number) {
  return `${count} ${count === 1 ? 'comanda' : 'comandas'}`
}
