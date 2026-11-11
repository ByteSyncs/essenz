import { describe, expect, it } from 'vitest'
import { commandsLabel, parseShiftResponse, splitByShift } from './shift'

const at = (iso: string, id = iso) => ({ id, created_at: iso })

describe('splitByShift', () => {
  const orders = [
    at('2026-11-06T22:10:00Z', 'c2'),
    at('2026-11-06T18:00:00Z', 'p1'),
    at('2026-11-06T22:00:00Z', 'c1'),
    at('2026-11-06T19:30:00Z', 'p2'),
  ]

  it('separa por turno y ordena cada grupo por llegada', () => {
    const { previous, current } = splitByShift(orders, '2026-11-06T21:00:00Z')
    expect(previous.map((o) => o.id)).toEqual(['p1', 'p2'])
    expect(current.map((o) => o.id)).toEqual(['c1', 'c2'])
  })

  it('sin turno todo es del turno actual', () => {
    const { previous, current } = splitByShift(orders, null)
    expect(previous).toEqual([])
    expect(current).toHaveLength(4)
  })

  it('una comanda recién creada acá cuenta como actual aunque el reloj difiera', () => {
    const { previous, current } = splitByShift(
      [at('2026-11-06T20:59:58Z', 'nuevo')],
      '2026-11-06T21:00:00Z',
      (order) => order.id === 'nuevo',
    )
    expect(previous).toEqual([])
    expect(current).toHaveLength(1)
  })

  it('una comanda justo en el límite es del turno nuevo', () => {
    const { current } = splitByShift([at('2026-11-06T21:00:00Z', 'x')], '2026-11-06T21:00:00Z')
    expect(current).toHaveLength(1)
  })
})

describe('parseShiftResponse', () => {
  it('lee id, inicio y cantidad', () => {
    expect(
      parseShiftResponse({
        data: {
          id: 's',
          startedAt: '2026-11-06T00:00:00Z',
          count: 7,
          cashRegisterStatus: 'open',
        },
      }),
    ).toEqual({
      id: 's',
      startedAt: '2026-11-06T00:00:00Z',
      count: 7,
      cashRegisterStatus: 'open',
    })
  })

  it('rechaza respuestas incompletas y normaliza cantidades raras', () => {
    expect(parseShiftResponse(null)).toBeNull()
    expect(parseShiftResponse({ data: { id: 's' } })).toBeNull()
    expect(parseShiftResponse({ data: { id: 's', startedAt: 'x', count: -3 } })?.count).toBe(0)
    expect(parseShiftResponse({ data: { id: 's', startedAt: 'x', count: 'abc' } })?.count).toBe(0)
    expect(
      parseShiftResponse({ data: { id: 's', startedAt: 'x', count: 0 } })?.cashRegisterStatus,
    ).toBe('unavailable')
  })
})

describe('commandsLabel', () => {
  it('conjuga singular y plural', () => {
    expect(commandsLabel(0)).toBe('0 comandas')
    expect(commandsLabel(1)).toBe('1 comanda')
    expect(commandsLabel(12)).toBe('12 comandas')
  })
})
