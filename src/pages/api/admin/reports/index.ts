import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin } from "../../../../lib/auth"

export const prerender = false

interface ReviewRow {
  id: string
  wall_date: string
  body: string
  author_name: string | null
  user_id: string | null
  created_at: string
  edited_at: string | null
  hidden: number
  report_count: number
  reaction_count: number
}

export const GET: APIRoute = async ({ request }) => {
  const actor = await getSessionUser(request)

  if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review notes.")

  try {
    const rows = await env.DB.prepare(
      `SELECT
         p.id, p.wall_date, p.body, p.author_name, p.user_id,
         p.created_at, p.edited_at, p.hidden,
         (SELECT COUNT(*) FROM reports r WHERE r.pin_id = p.id) AS report_count,
         (SELECT COUNT(*) FROM reactions re WHERE re.pin_id = p.id) AS reaction_count
       FROM pins p
       WHERE p.status = 'active' AND (p.hidden = 1 OR p.edited_at IS NOT NULL
         OR EXISTS (SELECT 1 FROM reports r WHERE r.pin_id = p.id))
       ORDER BY p.hidden DESC, report_count DESC, p.created_at DESC
       LIMIT 200`,
    ).all<ReviewRow>()

    return jsonResponse({ notes: rows.results })
  } catch (error) {
    logApiError("GET /api/admin/reports", error)

    return errorResponse(500, "review_unavailable", "The moderation queue could not be loaded.")
  }
}
