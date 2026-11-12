export type CashMovementType = 'cash_in' | 'cash_out' | 'safe_drop'

export interface CashPaymentSummary {
  method: string
  amount: number
  tickets: number
}

export interface CashRegisterSummary {
  ticketCount: number
  cancelledTicketCount: number
  grossSales: number
  discounts: number
  netSales: number
  tips: number
  cashExpenses: number
  cashTipAmbiguity: number
  paymentMethods: CashPaymentSummary[]
  movements: {
    cashIn: number
    cashOut: number
    safeDrop: number
  }
  cashExpected: number
}

export interface CashRegisterMovement {
  id: string
  type: CashMovementType
  amount: number
  description: string
  note: string | null
  createdAt: string
  createdByName: string | null
  voidedAt: string | null
}

export interface CashRegisterExpense {
  id: string
  description: string
  amount: number
  category: string
  createdAt: string
}

export interface CashRegisterSession {
  id: string
  openedAt: string
  openedByName: string | null
  openingAmount: number
  openingNote: string | null
  closedAt: string | null
  closedByName: string | null
  cashExpected: number | null
  cashCounted: number | null
  difference: number | null
  differenceReason: string | null
  closingNote: string | null
  summary: CashRegisterSummary | null
  movements: CashRegisterMovement[]
  expenses: CashRegisterExpense[]
}

export interface CashRegisterData {
  active: CashRegisterSession | null
  history: CashRegisterSession[]
}
