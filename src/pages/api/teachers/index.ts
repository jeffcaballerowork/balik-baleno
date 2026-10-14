import type { APIRoute } from "astro"
import { jsonResponse, logApiError, errorResponse } from "../../../lib/api-response"
import { getAllTeachers } from "../../../lib/teachers"

export const prerender = false

export const GET: APIRoute = async () => {
  try {
    const teachers = await getAllTeachers()
    return jsonResponse({ teachers })
  } catch (error) {
    logApiError("GET /api/teachers", error)
    return errorResponse(500, "teachers_load_failed", "Could not load teachers.")
  }
}
