import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser, serializeUser } from "../../../lib/auth"

export const prerender = false

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getSessionUser(request)

    return jsonResponse({ user: user ? serializeUser(user) : null })
  } catch (error) {
    logApiError("GET /api/auth/me", error)

    return errorResponse(500, "auth_unavailable", "Unable to check your sign-in status.")
  }
}
