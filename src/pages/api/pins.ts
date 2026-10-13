import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import { WALL_CONFIG } from "../../config"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../lib/api-response"

import { getSessionUser, isAdmin, isApproved, verifyCsrfRequest } from "../../lib/auth"

import { getManilaDate } from "../../lib/wall-date"

import { hashOwnerToken } from "../../lib/owner-hash"

export const prerender = false

const pinKinds = ["sticky", "torn", "notebook", "polaroid", "card"] as const

const pinColors = ["yellow", "pink", "blue", "green", "mustard"] as const

const pinFonts = ["hand", "serif"] as const

const pinInputSchema = z.object({
  deviceToken: z.string().regex(/^[a-f0-9]{64}$/),

  kind: z.enum(pinKinds),

  color: z.enum(pinColors).nullable(),

  body: z.string().min(1).max(220),

  authorName: z.string().max(120).nullable(),

  font: z.enum(pinFonts),

  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),

  doodle: z.string().max(16).nullable(),

  drawing: z.array(z.string().max(5000)).max(20),

  x: z.number().min(0).max(WALL_CONFIG.logicalCanvasWidth),

  y: z.number().min(0).max(WALL_CONFIG.logicalCanvasHeight),

  rotation: z.number().min(-15).max(15),

  hasPhoto: z.boolean(),
})

interface PinCounts {
  wall_count: number

  user_count: number
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Only approved alumni can post notes.")
  }

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "The request body must be valid JSON.",
    )
  }

  const parsed = pinInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(400, "invalid_pin", "The pin details are invalid.")
  }

  if (parsed.data.hasPhoto) {
    return errorResponse(
      501,
      "photo_uploads_unavailable",
      "Photo uploads are coming soon",
    )
  }

  if (!env.OWNER_HASH_SALT) {
    return errorResponse(
      500,

      "server_misconfigured",

      "Pin creation is temporarily unavailable.",
    )
  }

  const pin = parsed.data

  const wallDate = getManilaDate()

  const id = crypto.randomUUID()

  const createdAt = new Date().toISOString()

  const drawingJson = pin.drawing.length ? JSON.stringify(pin.drawing) : null

  // Notes are signed with the author's codename when set; otherwise the
  // supplied display value is kept so legacy anonymous posts still work.
  const signature = user.codename ?? pin.authorName

  try {
    const ownerHash = await hashOwnerToken(pin.deviceToken, env.OWNER_HASH_SALT)

    const insert = await env.DB.prepare(
      `INSERT INTO pins (
        id, wall_date, kind, color, body, author_name, font, ink, doodle,
        drawing_json, image_key, thumb_key, x_pct, y_pct, rotation, z_index,
        owner_hash, user_id, status, hidden, created_at, moved_at, edited_at
      )
      SELECT
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?,
        COALESCE(
          (SELECT MAX(z_index) + 1 FROM pins WHERE wall_date = ?),
          1
        ),
        ?, ?, 'active', 0, ?, NULL, NULL
      WHERE
        (SELECT COUNT(*) FROM pins
         WHERE wall_date = ? AND status = 'active' AND hidden = 0) < ?
        AND
        (SELECT COUNT(*) FROM pins
         WHERE wall_date = ? AND user_id = ?) < ?`,
    )

      .bind(
        id,

        wallDate,

        pin.kind,

        pin.color,

        pin.body,

        signature,

        pin.font,

        pin.ink,

        pin.doodle,

        drawingJson,

        (pin.x / WALL_CONFIG.logicalCanvasWidth) * 100,

        (pin.y / WALL_CONFIG.logicalCanvasHeight) * 100,

        pin.rotation,

        wallDate,

        ownerHash,

        user.id,

        createdAt,

        wallDate,

        WALL_CONFIG.dailyPinLimit,

        wallDate,

        user.id,

        WALL_CONFIG.dailyUserPinLimit,
      )

      .run()

    if (insert.meta.changes !== 1) {
      const counts = await env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM pins
           WHERE wall_date = ? AND status = 'active' AND hidden = 0) AS wall_count,
          (SELECT COUNT(*) FROM pins
           WHERE wall_date = ? AND user_id = ?) AS user_count`,
      )

        .bind(wallDate, wallDate, user.id)

        .first<PinCounts>()

      if (!counts) {
        throw new Error("Unable to determine current wall pin counts.")
      }

      if (!isAdmin(user) && counts.user_count >= WALL_CONFIG.dailyUserPinLimit) {
        return errorResponse(
          429,

          "daily_pin_limit",

          `You have reached your daily limit of ${WALL_CONFIG.dailyUserPinLimit} pins.`,
        )
      }

      if (counts.wall_count >= WALL_CONFIG.dailyPinLimit) {
        return errorResponse(
          409,

          "wall_full",

          "Today's wall has reached its pin limit.",
        )
      }

      throw new Error("The pin was not inserted.")
    }

    return jsonResponse({ id, wallDate }, 201)
  } catch (error) {
    logApiError("POST /api/pins", error)

    return errorResponse(
      500,

      "pin_unavailable",

      "Your note could not be added right now.",
    )
  }
}
