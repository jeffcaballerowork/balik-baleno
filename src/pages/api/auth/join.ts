import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"
import { z } from "zod"

import { AUTH_CONFIG } from "../../../config"
import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser, serializeUser, verifyCsrfRequest } from "../../../lib/auth"

export const prerender = false

const joinInputSchema = z.object({
  batchYear: z.number().int().min(AUTH_CONFIG.batchYearMinimum).max(AUTH_CONFIG.batchYearMaximum),
  note: z.string().trim().min(1).max(AUTH_CONFIG.joinNoteMaxLength),
})

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be valid JSON.")
  }

  const parsed = joinInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(400, "invalid_join_request", "Please provide your batch year and a short note.")
  }

  if (user.status === "approved") {
    return errorResponse(409, "already_approved", "Your account is already approved.")
  }

  if (user.status === "suspended") {
    return errorResponse(403, "account_suspended", "This account cannot submit a join request.")
  }

  try {
    const now = new Date().toISOString()
    const status = user.status === "declined" ? "pending" : user.status

    await env.DB.prepare(
      `UPDATE users
       SET batch_year = ?, join_note = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(parsed.data.batchYear, parsed.data.note, status, now, user.id)
      .run()

    const updated = { ...user, batchYear: parsed.data.batchYear, joinNote: parsed.data.note, status, updatedAt: now }

    return jsonResponse({ user: serializeUser(updated) })
  } catch (error) {
    logApiError("POST /api/auth/join", error)

    return errorResponse(500, "join_request_unavailable", "Your join request could not be saved.")
  }
}
