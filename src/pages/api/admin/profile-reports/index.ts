import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin } from "../../../../lib/auth"
import { listOpenProfileReports } from "../../../../lib/profile"

export const prerender = false

export const GET: APIRoute = async ({ request }) => {
  const actor = await getSessionUser(request)

  if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review reports.")

  try {
    return jsonResponse({ reports: await listOpenProfileReports() })
  } catch (error) {
    logApiError("GET /api/admin/profile-reports", error)

    return errorResponse(500, "reports_unavailable", "The profile reports could not be loaded.")
  }
}
