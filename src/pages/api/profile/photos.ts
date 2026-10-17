import { env } from "cloudflare:workers"

import type { APIRoute } from "astro"

import { PROFILE_CONFIG } from "../../../config"
import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { getSessionUser, isApproved, verifyCsrfRequest } from "../../../lib/auth"
import { type MediaKind, mediaUrl, savePhoto, sniffImageType, deletePhoto } from "../../../lib/media"
import {
  addGalleryPhoto,
  countGalleryPhotos,
  getSinglePhotoKey,
  isSinglePhotoKind,
  setSinglePhotoKey,
} from "../../../lib/profile"

export const prerender = false

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : ""

  return text === "" ? null : text
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Your account has not been approved yet.")
  }

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let form: FormData

  try {
    form = await request.formData()
  } catch {
    return errorResponse(400, "invalid_upload", "That upload could not be read.")
  }

  const requestedKind = String(form.get("kind") ?? "")

  // Narrowed once, so nothing below has to guess what slot was asked for.
  const target: MediaKind | null =
    requestedKind === "gallery" ? "gallery" : isSinglePhotoKind(requestedKind) ? requestedKind : null

  if (!target) return errorResponse(400, "invalid_kind", "That is not a photo slot we know about.")

  const file = form.get("file")

  if (!(file instanceof File)) return errorResponse(400, "invalid_upload", "Choose a photo to upload.")

  if (file.size === 0) return errorResponse(400, "invalid_upload", "That file is empty.")

  if (file.size > PROFILE_CONFIG.maxPhotoBytes) {
    const megabytes = Math.floor(PROFILE_CONFIG.maxPhotoBytes / 1_000_000)

    return errorResponse(
      413,
      "photo_too_large",
      `Each photo needs to be under ${megabytes} MB. Try a smaller one.`,
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())

  // The type comes from the bytes, so a renamed text file is turned away here
  // rather than stored and served back as an image.
  if (!sniffImageType(bytes)) {
    return errorResponse(400, "unsupported_image", "Photos need to be a JPEG, PNG or WebP.")
  }

  const caption = trimmedOrNull(form.get("caption"))

  if (caption && caption.length > PROFILE_CONFIG.maxCaptionLength) {
    return errorResponse(400, "caption_too_long", "That caption is too long.")
  }

  try {
    if (target === "gallery") {
      const used = await countGalleryPhotos(user.id)

      if (used >= PROFILE_CONFIG.maxGalleryPhotos) {
        return errorResponse(
          409,
          "gallery_full",
          `Your gallery holds ${PROFILE_CONFIG.maxGalleryPhotos} photos. Remove one first.`,
        )
      }

      const key = await savePhoto(env.MEDIA, user.id, "gallery", bytes)
      const photo = await addGalleryPhoto(user.id, key, caption)

      return jsonResponse({ photo: { ...photo, url: mediaUrl(photo.r2_key) } }, 201)
    }

    // Replacing a photo writes the new one first, then forgets the old, so a
    // failure halfway leaves the member with the photo they had.
    const previous = await getSinglePhotoKey(user.id, target)
    const key = await savePhoto(env.MEDIA, user.id, target, bytes)

    await setSinglePhotoKey(user.id, target, key)
    await deletePhoto(env.MEDIA, previous)

    return jsonResponse({ key, url: mediaUrl(key) }, 201)
  } catch (error) {
    logApiError("POST /api/profile/photos", error)

    return errorResponse(500, "photo_upload_failed", "That photo could not be saved.")
  }
}
