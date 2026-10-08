import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser, serializeUser } from "../../../lib/auth"

export const prerender = false

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getSessionUser(request)

    if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

    if (user.status !== "approved") {
      return errorResponse(403, "approval_required", "Your account has not been approved yet.")
    }

    return jsonResponse({ user: serializeUser(user) })
  } catch (error) {
    logApiError("GET /api/auth/approved", error)

    return errorResponse(500, "auth_unavailable", "Unable to verify your account.")
  }
}
