import type { APIRoute } from "astro"

import { z } from "zod"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser, isApproved, verifyCsrfRequest } from "../../../lib/auth"
import { slugify } from "../../../lib/interests"
import { countPendingSuggestions, suggestInterest } from "../../../lib/interests-db"

export const prerender = false

/** A member may have this many lines waiting on an admin at once. */
const MAX_PENDING_SUGGESTIONS = 3

const suggestionSchema = z.object({
  text: z.string().trim().min(2).max(80),
})

export const POST: APIRoute = async ({ request }) => {
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

  const parsed = suggestionSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(400, "invalid_suggestion", "Write a short interest, between 2 and 80 characters.")
  }

  // Something that slugs to nothing would be unpickable even if approved.
  if (!slugify(parsed.data.text)) {
    return errorResponse(400, "invalid_suggestion", "That needs at least one letter or number.")
  }

  try {
    if ((await countPendingSuggestions(user.id)) >= MAX_PENDING_SUGGESTIONS) {
      return errorResponse(
        409,
        "too_many_suggestions",
        `You already have ${MAX_PENDING_SUGGESTIONS} waiting. Give the admin a moment.`,
      )
    }

    // Idempotent: the same line twice leaves one row waiting.
    await suggestInterest(user.id, parsed.data.text)

    return jsonResponse({ queued: true })
  } catch (error) {
    logApiError("POST /api/interests/suggest", error)

    return errorResponse(500, "suggestion_failed", "That suggestion could not be sent.")
  }
}
