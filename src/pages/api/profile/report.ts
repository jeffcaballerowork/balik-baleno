import type { APIRoute } from "astro"

import { z } from "zod"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser, isApproved, verifyCsrfRequest } from "../../../lib/auth"
import { getUserExists, reportProfile } from "../../../lib/profile"

export const prerender = false

const reportSchema = z.object({
  target_id: z.string().uuid(),
  note: z.string().trim().max(500).nullable().optional(),
})

/**
 * Option B from the spec: one account-level report per member per target, read
 * by an admin, who can ask the member to change something or suspend the
 * account. Deliberately no per-photo tool and no auto-hide by report count.
 */
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

  const parsed = reportSchema.safeParse(body)

  if (!parsed.success) return errorResponse(400, "invalid_report", "That report could not be read.")

  // Reporting yourself is nothing to act on, so it is a quiet no-op rather than
  // an error the member has to understand.
  if (parsed.data.target_id === user.id) return jsonResponse({ reported: false })

  try {
    if (!(await getUserExists(parsed.data.target_id))) {
      return errorResponse(404, "profile_not_found", "That profile no longer exists.")
    }

    await reportProfile(user.id, parsed.data.target_id, parsed.data.note ?? null)

    return jsonResponse({ reported: true })
  } catch (error) {
    logApiError("POST /api/profile/report", error)

    return errorResponse(500, "report_failed", "That report could not be sent.")
  }
}
