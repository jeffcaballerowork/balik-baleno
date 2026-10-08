import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"
import { z } from "zod"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin, verifyCsrfRequest } from "../../../../lib/auth"

export const prerender = false

const targetIdSchema = z.string().uuid()
const approvalInputSchema = z.object({ action: z.enum(["approve", "decline"]) })

interface TargetUserRow {
  id: string
  status: "pending" | "approved" | "declined" | "suspended"
}

export const POST: APIRoute = async ({ params, request }) => {
  const parsedId = targetIdSchema.safeParse(params.id)

  if (!parsedId.success) return errorResponse(400, "invalid_user_id", "The account ID is invalid.")

  const actor = await getSessionUser(request)

  if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review accounts.")

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be valid JSON.")
  }

  const parsed = approvalInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(400, "invalid_approval_action", "Choose whether to approve or decline this account.")
  }

  if (actor.id === parsedId.data) {
    return errorResponse(409, "self_review_forbidden", "Administrators cannot review their own account.")
  }

  try {
    const target = await env.DB.prepare("SELECT id, status FROM users WHERE id = ?")
      .bind(parsedId.data)
      .first<TargetUserRow>()

    if (!target) return errorResponse(404, "user_not_found", "That account no longer exists.")

    if (target.status !== "pending") {
      return errorResponse(409, "review_not_pending", "Only pending accounts can be reviewed.")
    }

    const status = parsed.data.action === "approve" ? "approved" : "declined"
    const auditAction = parsed.data.action === "approve" ? "user_approved" : "user_declined"
    const now = new Date().toISOString()
    const auditId = crypto.randomUUID()

    const updated = await env.DB.prepare(
      "UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND status = 'pending'",
    )
      .bind(status, now, target.id)
      .run()

    if (updated.meta.changes !== 1) {
      return errorResponse(409, "review_not_pending", "Only pending accounts can be reviewed.")
    }

    await env.DB.prepare(
      `INSERT INTO admin_audit (
         id, actor_user_id, action, target_user_id, details_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        auditId,
        actor.id,
        auditAction,
        target.id,
        JSON.stringify({ previousStatus: target.status, nextStatus: status }),
        now,
      )
      .run()

    return jsonResponse({ id: target.id, status })
  } catch (error) {
    logApiError("POST /api/admin/approvals/:id", error)

    return errorResponse(500, "approval_unavailable", "This account could not be reviewed.")
  }
}
