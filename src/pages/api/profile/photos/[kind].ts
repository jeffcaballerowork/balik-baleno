import { env } from "cloudflare:workers"

import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isApproved, verifyCsrfRequest } from "../../../../lib/auth"
import { deletePhoto } from "../../../../lib/media"
import { getSinglePhotoKey, isSinglePhotoKind, setSinglePhotoKey } from "../../../../lib/profile"

export const prerender = false

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  const kind = params.kind ?? ""

  if (!isSinglePhotoKind(kind)) {
    return errorResponse(400, "invalid_kind", "That is not a photo slot we know about.")
  }

  try {
    const previous = await getSinglePhotoKey(user.id, kind)

    await setSinglePhotoKey(user.id, kind, null)
    await deletePhoto(env.MEDIA, previous)

    return jsonResponse({ removed: previous !== null })
  } catch (error) {
    logApiError("DELETE /api/profile/photos/[kind]", error)

    return errorResponse(500, "photo_delete_failed", "That photo could not be removed.")
  }
}
