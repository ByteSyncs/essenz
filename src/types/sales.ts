export interface SalesProductLine {
  id: string | null
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export interface SalesPayment {
  method: string
  amount: number
}

export interface SalesTicket {
  id: string
  createdAt: string
  status: string
  totalPrice: number
  discountAmount: number
  tipAmount: number
  tipPaymentMethod: string | null
  tipIncludedInPayments: boolean
  payments: SalesPayment[]
  items: SalesProductLine[]
}

export interface SalesProductSummary {
  key: string
  name: string
  units: number
  amount: number
  tickets: number
  paymentMethods: string[]
}

export interface SalesHourSummary {
  hour: number
  units: number
  sales: number
  tickets: number
}

export interface SalesPaymentSummary {
  method: string
  amount: number
  tickets: number
}

export interface SalesReport {
  date: string
  tickets: SalesTicket[]
}
