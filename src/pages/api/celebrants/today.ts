import type { APIRoute } from "astro"
import { env } from "cloudflare:workers"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"

export const prerender = false

export const GET: APIRoute = async () => {
  try {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    const query = "SELECT id, display_name, batch_year, birthday_visible FROM users WHERE status = 'approved' AND birthday_visible = 1 AND birth_month = ? AND birth_day = ? ORDER BY display_name ASC"
    const { results } = await env.DB.prepare(query)
      .bind(month, day)
      .all<{ id: string; display_name: string; batch_year: number; birthday_visible: number }>()

    return jsonResponse({ celebrants: results })
  } catch (error) {
    logApiError("GET /api/celebrants/today", error)
    return errorResponse(500, "celebrants_unavailable", "Could not load today's celebrants.")
  }
}
