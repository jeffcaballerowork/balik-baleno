import type { APIRoute } from "astro"

import { AUTH_CONFIG } from "../../../config"
import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { deleteSession, getCookieOptions, verifyCsrfRequest } from "../../../lib/auth"

export const prerender = false

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  try {
    await deleteSession(request)
    cookies.delete(AUTH_CONFIG.sessionCookieName, getCookieOptions(request, 0))

    return jsonResponse({ signedOut: true })
  } catch (error) {
    logApiError("POST /api/auth/signout", error)

    return errorResponse(500, "signout_unavailable", "You could not be signed out right now.")
  }
}
