import { defineMiddleware } from 'astro:middleware'
import supabase from './libs/supabase'

const MAIN_APP_ROUTES = ['/admin', '/auth', '/error', '/api', '/checkout', '/_image']
const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30

export const onRequest = defineMiddleware(async ({ locals, url, cookies, redirect }, next) => {
  locals.supabase = supabase

  const pathname = url.pathname
  const host = url.host

  const isMainAppRoute =
    pathname === '/' || MAIN_APP_ROUTES.some((route) => pathname.startsWith(route))

  let tenantIdentifier: string | null = null
  let isCustomDomain = false

  const isMainHost =
    host.includes(import.meta.env.PUBLIC_SITE_URL) ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('ngrok-free.dev')

  const normalURLS =
    !pathname.startsWith('/error/suspended') &&
    !pathname.startsWith('/auth/verify-email') &&
    !pathname.startsWith('/404') &&
    !pathname.startsWith('/500') &&
    !pathname.startsWith('/admin/setup')

  if (isMainHost) {
    if (!isMainAppRoute) {
      const pathSegments = pathname.split('/').filter(Boolean)
      if (pathSegments.length > 0) {
        tenantIdentifier = pathSegments[0]
      }
    }
  } else {
    if (host.endsWith('.bytesyncs.com')) {
      tenantIdentifier = host.replace('.bytesyncs.com', '')
    } else {
      tenantIdentifier = host
      isCustomDomain = true
    }
  }

  locals.tenantIdentifier = tenantIdentifier

  const isTryingToAccessAdmin = pathname.includes('/admin') || pathname.includes('/checkout')
  const isTryingToAccessMenu =
    pathname.includes('/menu') || (!isMainAppRoute && !isTryingToAccessAdmin)

  if (tenantIdentifier && normalURLS && isTryingToAccessMenu) {
    const query = isCustomDomain
      ? locals.supabase
          .from('organizations')
          .select('id, subscriptions(status)')
          .eq('custom_domain', tenantIdentifier)
          .single()
      : locals.supabase
          .from('organizations')
          .select('id, subscriptions(status)')
          .eq('slug', tenantIdentifier)
          .single()

    const { data: org, error } = await query

    const orgStatus = Array.isArray(org?.subscriptions) ? org.subscriptions[0] : org?.subscriptions

    if (error || !org || orgStatus?.status === 'unpaid') {
      console.error(error)
      return redirect('/404')
    }
  }

  const pathSegments = pathname.split('/').filter(Boolean)

  const isAdminRoute =
    pathSegments[0] === 'admin' || pathSegments[1] === 'admin' || pathSegments.includes('admin')
  const isPublicAdminRoute = pathname === '/auth/sign-in'
  const isPrivateAdminRoute = isAdminRoute && !isPublicAdminRoute
  const isCheckoutRoute = pathname.includes('/checkout')
  const isBillingPage = pathname.includes('/admin/billing') || isCheckoutRoute

  if (isPrivateAdminRoute || isCheckoutRoute) {
    const accessToken = cookies.get('sb-access-token')?.value
    const refreshToken = cookies.get('sb-refresh-token')?.value

    if (!accessToken || !refreshToken) {
      return redirect('/auth/sign-in')
    }

    const { data, error } = await locals.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      cookies.delete('sb-access-token', { path: '/' })
      cookies.delete('sb-refresh-token', { path: '/' })
      return redirect(isAdminRoute ? '/auth/sign-in' : '/')
    }

    const { access_token, refresh_token } = data.session
    cookies.set('sb-access-token', access_token, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ONE_MONTH_IN_SECONDS,
    })
    cookies.set('sb-refresh-token', refresh_token, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ONE_MONTH_IN_SECONDS,
    })

    locals.user = data.session.user

    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select(
        `
        organization_id,
        organizations (
          subscriptions (
            status,
            current_period_end
          )
        )
      `,
      )
      .eq('id', locals.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('Error obtain profile in checkout:', profileError)
      return redirect('/auth/sign-in?error=profile_not_found')
    }

    const org = Array.isArray(profile?.organizations)
      ? profile.organizations[0]
      : profile?.organizations

    const sub = Array.isArray(org?.subscriptions) ? org.subscriptions[0] : org?.subscriptions
    const isExpired = sub?.current_period_end ? new Date(sub.current_period_end) < new Date() : true

    const hasActiveSubscription = sub?.status === 'active' && !isExpired

    if (isBillingPage && hasActiveSubscription) {
      return redirect(`/${tenantIdentifier}/admin/dashboard`)
    }

    if (!hasActiveSubscription && !isCheckoutRoute) {
      return redirect(`/${tenantIdentifier}/admin/billing/upgrade`)
    }

    if (!hasActiveSubscription && !isCheckoutRoute && !pathname.includes('/admin/billing')) {
      return redirect('/error/suspended')
    }
  }

  const response = await next()

  if (pathname.includes('/menu')) {
    response.headers.set('Cache-Control', 'public, max-age=3600')
  }

  return response
})
