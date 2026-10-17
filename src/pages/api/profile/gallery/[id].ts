import { env } from "cloudflare:workers"

import type { APIRoute } from "astro"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isApproved, verifyCsrfRequest } from "../../../../lib/auth"
import { deletePhoto } from "../../../../lib/media"
import { galleryPhotoUpdateSchema } from "../../../../lib/profile-input"
import { deleteGalleryPhoto, getGalleryPhoto, updateGalleryPhoto } from "../../../../lib/profile"

export const prerender = false

export const PATCH: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be valid JSON.")
  }

  const parsed = galleryPhotoUpdateSchema.safeParse(body)

  if (!parsed.success) return errorResponse(400, "invalid_caption", "That caption is too long.")

  try {
    // Owner-scoped: another member's photo id is simply not found.
    const photo = await getGalleryPhoto(user.id, params.id ?? "")

    if (!photo) return errorResponse(404, "photo_not_found", "That photo is no longer there.")

    const caption = parsed.data.caption === undefined ? photo.caption : parsed.data.caption

    await updateGalleryPhoto(photo.id, caption, parsed.data.position ?? photo.position)

    return jsonResponse({
      photo: { ...photo, caption, position: parsed.data.position ?? photo.position },
    })
  } catch (error) {
    logApiError("PATCH /api/profile/gallery/[id]", error)

    return errorResponse(500, "photo_update_failed", "That photo could not be updated.")
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  try {
    const photo = await getGalleryPhoto(user.id, params.id ?? "")

    if (!photo) return errorResponse(404, "photo_not_found", "That photo is no longer there.")

    // Row first, then bytes: an orphaned object is invisible, a row pointing at
    // a deleted object is a broken image on someone's profile.
    await deleteGalleryPhoto(photo.id)
    await deletePhoto(env.MEDIA, photo.r2_key)

    return jsonResponse({ removed: true })
  } catch (error) {
    logApiError("DELETE /api/profile/gallery/[id]", error)

    return errorResponse(500, "photo_delete_failed", "That photo could not be removed.")
  }
}
