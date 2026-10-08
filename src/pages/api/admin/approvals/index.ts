import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"
import { z } from "zod"

import { AUTH_CONFIG } from "../../../../config"
import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin } from "../../../../lib/auth"

export const prerender = false

const statusSchema = z.enum(AUTH_CONFIG.statuses)

interface PendingUserRow {
  id: string
  email: string
  display_name: string
  batch_year: number | null
  join_note: string | null
  status: "pending" | "approved" | "declined" | "suspended"
  created_at: string
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const actor = await getSessionUser(request)

    if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

    if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review accounts.")

    const parsedStatus = statusSchema.safeParse(url.searchParams.get("status") ?? "pending")

    if (!parsedStatus.success) {
      return errorResponse(400, "invalid_status", "The requested account status is invalid.")
    }

    const users = await env.DB.prepare(
      `SELECT id, email, display_name, batch_year, join_note, status, created_at
       FROM users
       WHERE status = ?
       ORDER BY created_at ASC`,
    )
      .bind(parsedStatus.data)
      .all<PendingUserRow>()

    return jsonResponse({ users: users.results })
  } catch (error) {
    logApiError("GET /api/admin/approvals", error)

    return errorResponse(500, "approval_queue_unavailable", "The approval queue could not be loaded.")
  }
}
