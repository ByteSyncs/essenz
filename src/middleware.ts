import { defineMiddleware } from 'astro:middleware'
import { createRequestSupabase } from './libs/supabase'
import { canAccessOrganizationApi, isOwnerRole } from './libs/permissions'
import { readProfileCache, writeProfileCache, type ProfileSnapshot } from './libs/profileCache'

const MAIN_APP_ROUTES = [
  '/admin',
  '/auth',
  '/error',
  '/api',
  '/checkout',
  '/plans',
  '/demo-modern',
  '/demo-minimalist',
  '/menu-unavailable',
  '/404',
  '/500',
  '/favicon.svg',
  '/robots.txt',
  '/sitemap-index.xml',
  '/_image',
  '/@id',
  '/@fs',
  '/@vite',
]

const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30
const MAIN_SITE_HOSTNAME = new URL(import.meta.env.PUBLIC_SITE_URL).hostname.toLowerCase()
const BYTESYNCS_DOMAIN = '.bytesyncs.com'

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

function getRelatedRecord<T>(record: T | T[] | null | undefined): T | null {
  return Array.isArray(record) ? (record[0] ?? null) : (record ?? null)
}

function unauthorizedResponse() {
  return Response.json(
    { success: false, error: 'unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

function privateRedirect(redirect: (path: string) => Response, path: string) {
  const response = redirect(path)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

function hasActiveSubscription(
  subscription: { status?: string | null; current_period_end?: string | null } | null,
) {
  if (subscription?.status !== 'active' || !subscription.current_period_end) return false
  return new Date(subscription.current_period_end) >= new Date()
}

export const onRequest = defineMiddleware(
  async ({ locals, url, cookies, redirect, request }, next) => {
    locals.supabase = createRequestSupabase()
    locals.user = null

    const pathname = url.pathname
    const hostname = url.hostname.toLowerCase()
    const pathSegments = pathname.split('/').filter(Boolean)
    const isStaticAsset = Boolean(pathSegments[pathSegments.length - 1]?.includes('.'))
    const isDevelopmentHost =
      import.meta.env.DEV &&
      (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === 'ngrok-free.dev' ||
        hostname.endsWith('.ngrok-free.dev'))
    const isMainHost = hostname === MAIN_SITE_HOSTNAME || isDevelopmentHost
    const isMainAppRoute =
      isMainHost &&
      (pathname === '/' ||
        isStaticAsset ||
        MAIN_APP_ROUTES.some((route) => matchesRoute(pathname, route)))

    let tenantIdentifier: string | null = null
    let isCustomDomain = false

    if (isMainHost) {
      if (!isMainAppRoute && pathSegments.length > 0) {
        const firstSegment = pathSegments[0]
        if (!firstSegment.startsWith('@') && !firstSegment.startsWith('_')) {
          tenantIdentifier = firstSegment
        }
      }
    } else if (hostname.endsWith(BYTESYNCS_DOMAIN)) {
      tenantIdentifier = hostname.slice(0, -BYTESYNCS_DOMAIN.length)
      if (!tenantIdentifier || tenantIdentifier.includes('.')) {
        return redirect('/404')
      }
    } else {
      tenantIdentifier = hostname
      isCustomDomain = true
    }

    locals.tenantIdentifier = tenantIdentifier

    const isAdminRoute = pathSegments.includes('admin')
    const isCheckoutRoute = matchesRoute(pathname, '/checkout')
    const isApiRoute = matchesRoute(pathname, '/api')
    const isOrganizationApiRoute =
      isApiRoute && pathSegments[1] === 'organizations' && Boolean(pathSegments[2])
    const isSetupApiRoute = pathname === '/api/auth/setup'
    const isBillingPage =
      isCheckoutRoute ||
      (isAdminRoute && pathSegments[pathSegments.indexOf('admin') + 1] === 'billing')
    const isProtectedRoute =
      isAdminRoute || isCheckoutRoute || isOrganizationApiRoute || isSetupApiRoute
    const accessToken = cookies.get('sb-access-token')?.value
    const refreshToken = cookies.get('sb-refresh-token')?.value

    if (accessToken && refreshToken) {
      const { data, error } = await locals.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error || !data.session) {
        cookies.delete('sb-access-token', { path: '/' })
        cookies.delete('sb-refresh-token', { path: '/' })
        if (isProtectedRoute) {
          return isApiRoute ? unauthorizedResponse() : privateRedirect(redirect, '/auth/sign-in')
        }
      } else {
        const { access_token, refresh_token } = data.session
        cookies.set('sb-access-token', access_token, {
          path: '/',
          secure: url.protocol === 'https:',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: ONE_MONTH_IN_SECONDS,
        })
        cookies.set('sb-refresh-token', refresh_token, {
          path: '/',
          secure: url.protocol === 'https:',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: ONE_MONTH_IN_SECONDS,
        })
        locals.user = data.session.user
      }
    } else if (accessToken || refreshToken) {
      cookies.delete('sb-access-token', { path: '/' })
      cookies.delete('sb-refresh-token', { path: '/' })
      if (isProtectedRoute) {
        return isApiRoute ? unauthorizedResponse() : privateRedirect(redirect, '/auth/sign-in')
      }
    } else if (isProtectedRoute) {
      return isApiRoute ? unauthorizedResponse() : privateRedirect(redirect, '/auth/sign-in')
    }

    const organizationApiSlug = isOrganizationApiRoute ? pathSegments[2] : null
    const requiresProfile =
      isAdminRoute || isCheckoutRoute || isOrganizationApiRoute || isSetupApiRoute
    let organizationSlug: string | null = null
    let subscription: ProfileSnapshot['subscription'] = null

    if (requiresProfile && locals.user) {
      let snapshot = readProfileCache(locals.user.id)

      if (!snapshot) {
        const { data: profile, error } = await locals.supabase
          .from('profiles')
          .select(
            `
            role,
            organizations (
              slug,
              subscriptions (status, current_period_end)
            )
          `,
          )
          .eq('id', locals.user.id)
          .maybeSingle()

        if (error || !profile) {
          return isApiRoute
            ? Response.json(
                { success: false, error: 'profile_not_found' },
                { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
              )
            : privateRedirect(redirect, '/auth/sign-in?error=profile_not_found')
        }

        const organization = getRelatedRecord(profile.organizations)

        snapshot = {
          role: profile.role,
          organizationSlug: organization?.slug ?? null,
          subscription: getRelatedRecord(organization?.subscriptions),
        }

        if (hasActiveSubscription(snapshot.subscription)) {
          writeProfileCache(locals.user.id, snapshot)
        }
      }

      organizationSlug = snapshot.organizationSlug
      subscription = snapshot.subscription

      if (isBillingPage && !isOwnerRole(snapshot.role)) {
        return isApiRoute
          ? Response.json(
              { success: false, error: 'owner_access_required' },
              { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
            )
          : privateRedirect(redirect, `/${organizationSlug}/admin/dashboard`)
      }

      const requestedOrganizationSlug = isAdminRoute ? tenantIdentifier : organizationApiSlug
      if (
        (isAdminRoute || isOrganizationApiRoute) &&
        (!requestedOrganizationSlug ||
          !organizationSlug ||
          requestedOrganizationSlug !== organizationSlug)
      ) {
        return isApiRoute
          ? Response.json(
              { success: false, error: 'not_found' },
              { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
            )
          : privateRedirect(redirect, '/404')
      }

      if (
        isOrganizationApiRoute &&
        !canAccessOrganizationApi(snapshot.role, request.method, pathSegments)
      ) {
        return Response.json(
          { success: false, error: 'owner_access_required' },
          { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        )
      }
    }

    if (
      tenantIdentifier &&
      !isStaticAsset &&
      !isMainAppRoute &&
      !isAdminRoute &&
      !isApiRoute &&
      !isCheckoutRoute
    ) {
      const selectQuery = 'id, subscriptions(status), organization_settings(menu_active)'
      const query = isCustomDomain
        ? locals.supabase
            .from('organizations')
            .select(selectQuery)
            .eq('custom_domain', tenantIdentifier)
            .maybeSingle()
        : locals.supabase
            .from('organizations')
            .select(selectQuery)
            .eq('slug', tenantIdentifier)
            .maybeSingle()

      const { data: organization, error } = await query
      if (error || !organization) return redirect('/404')

      const orgStatus = getRelatedRecord(organization.subscriptions)
      const settings = getRelatedRecord(organization.organization_settings)
      if (orgStatus?.status === 'unpaid') return redirect('/404')
      if (settings && !settings.menu_active) return redirect('/menu-unavailable')
    }

    const activeSubscription = hasActiveSubscription(subscription)

    if (isCheckoutRoute && activeSubscription && organizationSlug) {
      return privateRedirect(redirect, `/${organizationSlug}/admin/dashboard`)
    }

    if (isAdminRoute && organizationSlug) {
      if (isBillingPage && activeSubscription) {
        return privateRedirect(redirect, `/${organizationSlug}/admin/dashboard`)
      }
      if (!activeSubscription && !isBillingPage) {
        return privateRedirect(redirect, `/${organizationSlug}/admin/billing/upgrade`)
      }
    }

    if (isOrganizationApiRoute && !activeSubscription) {
      return Response.json(
        { success: false, error: 'subscription_required' },
        { status: 402, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const response = await next()

    if (isApiRoute || isAdminRoute || isCheckoutRoute || accessToken || refreshToken) {
      response.headers.set('Cache-Control', 'private, no-store')
    } else if (pathSegments.includes('menu')) {
      response.headers.set('Cache-Control', 'public, max-age=3600')
    }

    return response
  },
)
