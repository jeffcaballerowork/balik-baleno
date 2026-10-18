import type { APIRoute } from "astro"

import { AUTH_CONFIG } from "../../../config"
import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { createCsrfToken, getCookieOptions, hasAuthSecrets } from "../../../lib/auth"

export const prerender = false

export const GET: APIRoute = async ({ cookies, request }) => {
  if (!hasAuthSecrets()) {
    return errorResponse(503, "auth_unavailable", "Sign-in is not configured yet.")
  }

  try {
    const csrf = await createCsrfToken(request)

    cookies.set(AUTH_CONFIG.csrfCookieName, csrf.signedValue, {
      ...getCookieOptions(request, 60 * 60),
      httpOnly: false,
    })

    return jsonResponse({ token: csrf.token })
  } catch (error) {
    logApiError("GET /api/auth/csrf", error)

    return errorResponse(500, "csrf_unavailable", "Unable to prepare this request.")
  }
}