import { MercadoPagoConfig, Preference, PreApproval, Payment } from 'mercadopago'

export const client = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN,
})

export const preApproval = new PreApproval(client)
export const preference = new Preference(client)
export const payment = new Payment(client)
