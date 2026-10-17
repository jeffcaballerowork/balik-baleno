import type { APIRoute } from "astro"

import { z } from "zod"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin, verifyCsrfRequest } from "../../../../lib/auth"
import { closeProfileReport } from "../../../../lib/profile"

export const prerender = false

const reviewSchema = z.object({ action: z.literal("close") })

/**
 * Closing is the whole remedy under option B. There is no "remove this photo"
 * here on purpose: the choices are to ask the member or suspend the account.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const actor = await getSessionUser(request)

  if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review reports.")

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be valid JSON.")
  }

  if (!reviewSchema.safeParse(body).success) {
    return errorResponse(400, "invalid_review", "The only action here is to close the report.")
  }

  try {
    const report = await closeProfileReport(params.id ?? "", actor.id)

    if (!report) return errorResponse(404, "report_not_found", "That report is no longer open.")

    return jsonResponse({ id: report.id, status: "closed" })
  } catch (error) {
    logApiError("POST /api/admin/profile-reports/[id]", error)

    return errorResponse(500, "report_review_failed", "That report could not be closed.")
  }
}
