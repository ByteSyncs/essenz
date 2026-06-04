let cachedRate: number | null = null
let lastFetch = 0

export async function getUSDtoARS(locals: App.Locals) {
  const now = Date.now()

  if (cachedRate && now - lastFetch < 10 * 60 * 1000) return cachedRate

  const { data, error } = await locals.supabase
    .from('config')
    .select('value')
    .eq('key', 'usd_to_ars')
    .single()

  if (error) {
    console.error(error)
    return
  }

  cachedRate = Number(data?.value)
  lastFetch = now

  return cachedRate
}
