import type { APIRoute } from "astro"

import { z } from "zod"

import { PROFILE_CONFIG } from "../../../config"
import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser, isApproved, verifyCsrfRequest } from "../../../lib/auth"
import { togglePick } from "../../../lib/interests"
import { getUserInterests, setUserInterests } from "../../../lib/interests-db"

export const prerender = false

const picksSchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(80)).max(50),
})

export const GET: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  try {
    return jsonResponse({ interests: await getUserInterests(user.id) })
  } catch (error) {
    logApiError("GET /api/profile/interests", error)

    return errorResponse(500, "interests_unavailable", "Your interests could not be loaded.")
  }
}

/**
 * Replaces the whole set. The cap is enforced here, not only in the picker, so
 * an eleventh pick is refused by the server as well. Duplicates are folded away
 * and the store only accepts slugs that are active in the catalogue.
 */
export const PUT: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be valid JSON.")
  }

  const parsed = picksSchema.safeParse(body)

  if (!parsed.success) return errorResponse(400, "invalid_interests", "Those interests could not be saved.")

  let picks: string[] = []

  for (const slug of parsed.data.slugs) {
    picks = togglePick(picks, slug, PROFILE_CONFIG.maxInterests)
  }

  if (parsed.data.slugs.length > PROFILE_CONFIG.maxInterests) {
    return errorResponse(
      400,
      "too_many_interests",
      `You can pick up to ${PROFILE_CONFIG.maxInterests} interests.`,
    )
  }

  try {
    await setUserInterests(user.id, picks)

    return jsonResponse({ interests: await getUserInterests(user.id) })
  } catch (error) {
    logApiError("PUT /api/profile/interests", error)

    return errorResponse(500, "interests_save_failed", "Your interests could not be saved.")
  }
}
