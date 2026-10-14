import type { APIRoute } from "astro"
import { jsonResponse, logApiError, errorResponse } from "../../../../lib/api-response"
import { getNotesByTeacher, addTeacherNote } from "../../../../lib/teachers"
import { getSessionUser } from "../../../../lib/auth"

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  try {
    const teacherId = params.teacherId
    if (!teacherId) return errorResponse(400, "missing_teacher_id", "Teacher ID is required.")

    const notes = await getNotesByTeacher(teacherId)
    return jsonResponse({ notes })
  } catch (error) {
    logApiError("GET /api/teachers/[teacherId]/notes", error)
    return errorResponse(500, "notes_load_failed", "Could not load notes.")
  }
}

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const user = await getSessionUser(request)
    if (!user) return errorResponse(401, "not_signed_in", "You must be signed in.")
    
    const teacherId = params.teacherId
    if (!teacherId) return errorResponse(400, "missing_teacher_id", "Teacher ID is required.")

    const body = await request.json().catch(() => ({})) as { content?: string }
    if (!body.content || body.content.trim() === "") {
        return errorResponse(400, "missing_content", "Content is required.")
    }

    await addTeacherNote(teacherId, user.id, body.content.trim())
    return jsonResponse({ ok: true })
  } catch (error) {
    logApiError("POST /api/teachers/[teacherId]/notes", error)
    return errorResponse(500, "note_add_failed", "Could not add note.")
  }
}
