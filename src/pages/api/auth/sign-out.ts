import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('sb-access-token', { path: '/' })
  cookies.delete('sb-refresh-token', { path: '/' })
  const response = redirect('/auth/sign-in?notice=signed-out', 303)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
