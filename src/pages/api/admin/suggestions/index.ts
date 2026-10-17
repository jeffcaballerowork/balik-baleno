import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin } from "../../../../lib/auth"
import { listInterestGroups, listPendingSuggestions } from "../../../../lib/interests-db"

export const prerender = false

/** The queue, plus the group names an approving admin can file a new interest under. */
export const GET: APIRoute = async ({ request }) => {
  const actor = await getSessionUser(request)

  if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review suggestions.")

  try {
    const [suggestions, groups] = await Promise.all([listPendingSuggestions(), listInterestGroups()])

    return jsonResponse({ suggestions, groups })
  } catch (error) {
    logApiError("GET /api/admin/suggestions", error)

    return errorResponse(500, "suggestions_unavailable", "The suggestion queue could not be loaded.")
  }
}
