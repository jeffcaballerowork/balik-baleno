import type { APIRoute } from "astro"

import { PROFILE_CONFIG } from "../../config"
import { errorResponse, jsonResponse, logApiError } from "../../lib/api-response"
import { getSessionUser, isApproved } from "../../lib/auth"
import { listCatalogue } from "../../lib/interests-db"
import type { InterestOption } from "../../lib/interests"

export const prerender = false

/**
 * The shelf: the whole active catalogue, grouped, with the pick cap. Available
 * to any approved member, because choosing interests means reading the list.
 */
export const GET: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  try {
    const catalogue = await listCatalogue()
    const groups: { group: string; items: InterestOption[] }[] = []

    for (const interest of catalogue) {
      const existing = groups.find(entry => entry.group === interest.group)

      if (existing) existing.items.push(interest)
      else groups.push({ group: interest.group, items: [interest] })
    }

    return jsonResponse({ groups, cap: PROFILE_CONFIG.maxInterests })
  } catch (error) {
    logApiError("GET /api/interests", error)

    return errorResponse(500, "interests_unavailable", "The interest list could not be loaded.")
  }
}
