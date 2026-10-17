import type { APIRoute } from "astro"

import { PROFILE_CONFIG } from "../../config"
import { errorResponse, jsonResponse, logApiError } from "../../lib/api-response"
import { getSessionUser, isApproved, verifyCsrfRequest } from "../../lib/auth"
import { mediaUrl } from "../../lib/media"
import { getProfileRow, listGalleryPhotos, updateProfile } from "../../lib/profile"
import { profileInputSchema } from "../../lib/profile-input"
import { toEditableProfile, toProfileView } from "../../lib/profile-view"

export const prerender = false

/**
 * Everything the editor and the profile page need in one read: the public
 * projection, the owner's own values, and the raw photo keys with the URLs they
 * are served from. The keys are the member's own, so handing them back to the
 * owner is not a leak.
 */
async function profilePayload(userId: string) {
  const row = await getProfileRow(userId)

  if (!row) return null

  const gallery = await listGalleryPhotos(userId)

  return {
    profile: toProfileView(row),
    editable: toEditableProfile(row),
    photos: {
      cover: { key: row.cover_key, url: mediaUrl(row.cover_key) },
      avatar: { key: row.avatar_key, url: mediaUrl(row.avatar_key) },
      avatarThen: { key: row.avatar_then_key, url: mediaUrl(row.avatar_then_key) },
      gallery: gallery.map(photo => ({
        id: photo.id,
        caption: photo.caption,
        position: photo.position,
        url: mediaUrl(photo.r2_key),
      })),
      max: PROFILE_CONFIG.maxGalleryPhotos,
    },
  }
}

export const GET: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  try {
    const payload = await profilePayload(user.id)

    if (!payload) return errorResponse(404, "profile_not_found", "That profile no longer exists.")

    return jsonResponse(payload)
  } catch (error) {
    logApiError("GET /api/profile", error)

    return errorResponse(500, "profile_unavailable", "Your profile could not be loaded.")
  }
}

export const PUT: APIRoute = async ({ request }) => {
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

  const parsed = profileInputSchema.safeParse(body)

  if (!parsed.success) return errorResponse(400, "invalid_profile", "Please check your profile fields and try again.")

  try {
    await updateProfile(user.id, parsed.data)

    const payload = await profilePayload(user.id)

    if (!payload) return errorResponse(404, "profile_not_found", "That profile no longer exists.")

    return jsonResponse(payload)
  } catch (error) {
    logApiError("PUT /api/profile", error)

    return errorResponse(500, "profile_save_failed", "Your profile could not be saved.")
  }
}
