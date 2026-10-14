import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser } from "../../../lib/auth"
import { updateBirthday } from "../../../lib/users"

export const prerender = false

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return errorResponse(401, "not_signed_in", "You must be signed in.")
    }

    const body = await request.json().catch(() => ({})) as {
      birth_month?: number | null
      birth_day?: number | null
      birthday_visible?: boolean
    }

    const birthMonth = body.birth_month ?? null
    const birthDay = body.birth_day ?? null
    const birthdayVisible = body.birthday_visible === true ? 1 : 0

    // Validate month/day ranges
    if (birthMonth !== null && (birthMonth < 1 || birthMonth > 12)) {
      return errorResponse(400, "invalid_month", "Month must be between 1 and 12.")
    }
    if (birthDay !== null && (birthDay < 1 || birthDay > 31)) {
      return errorResponse(400, "invalid_day", "Day must be between 1 and 31.")
    }

    await updateBirthday(user.id, birthMonth, birthDay, birthdayVisible)

    return jsonResponse({ ok: true })
  } catch (error) {
    logApiError("POST /api/auth/birthday", error)
    return errorResponse(500, "birthday_update_failed", "Could not update birthday.")
  }
}