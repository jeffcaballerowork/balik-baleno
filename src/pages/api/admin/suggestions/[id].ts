import type { APIRoute } from "astro"

import { z } from "zod"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin, verifyCsrfRequest } from "../../../../lib/auth"
import {
  approveSuggestion,
  declineSuggestion,
  getSuggestion,
  listInterestGroups,
} from "../../../../lib/interests-db"

export const prerender = false

const reviewSchema = z.object({
  action: z.enum(["approve", "decline"]),
  group: z.string().trim().min(1).max(60).optional(),
})

export const POST: APIRoute = async ({ params, request }) => {
  const actor = await getSessionUser(request)

  if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review suggestions.")

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be valid JSON.")
  }

  const parsed = reviewSchema.safeParse(body)

  if (!parsed.success) return errorResponse(400, "invalid_review", "Choose whether to approve or decline.")

  try {
    const suggestion = await getSuggestion(params.id ?? "")

    if (!suggestion) return errorResponse(404, "suggestion_not_found", "That suggestion is no longer waiting.")

    if (suggestion.status !== "pending") {
      return errorResponse(409, "already_reviewed", "Somebody already answered that one.")
    }

    if (parsed.data.action === "decline") {
      await declineSuggestion(suggestion, actor.id)

      return jsonResponse({ id: suggestion.id, status: "declined" })
    }

    const groups = await listInterestGroups()
    const group = parsed.data.group ?? ""

    if (!groups.includes(group)) {
      return errorResponse(400, "invalid_group", "Pick one of the existing groups.")
    }

    const slug = await approveSuggestion(suggestion, group, actor.id)

    if (!slug) {
      return errorResponse(400, "unusable_suggestion", "That line has no letters or numbers to make a name from.")
    }

    return jsonResponse({ id: suggestion.id, status: "approved", slug, group })
  } catch (error) {
    logApiError("POST /api/admin/suggestions/[id]", error)

    return errorResponse(500, "suggestion_review_failed", "That suggestion could not be reviewed.")
  }
}
