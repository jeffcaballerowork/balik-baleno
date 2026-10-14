import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"

export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  try {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    const { results } = await locals.DB.prepare(
      `SELECT id, display_name, batch_year, birthday_visible
       FROM users
       WHERE status = 'approved'
         AND birthday_visible = 1
         AND birth_month = ?
         AND birth_day = ?
       ORDER BY display_name ASC`,
    )
      .bind(month, day)
      .all()

    return jsonResponse({ celebrants: results })
  } catch (error) {
    logApiError("GET /api/celebrants/today", error)
    return errorResponse(500, "celebrants_unavailable", "Could not load today's celebrants.")
  }
}