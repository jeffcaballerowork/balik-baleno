import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import { WALL_CONFIG } from "../../../../config"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../../lib/api-response"

import { getSessionUser, isAdmin, isApproved, verifyCsrfRequest } from "../../../../lib/auth"

import { getManilaDate } from "../../../../lib/wall-date"

export const prerender = false

const positionInputSchema = z.object({
  x: z.number().min(0).max(WALL_CONFIG.logicalCanvasWidth),

  y: z.number().min(0).max(WALL_CONFIG.logicalCanvasHeight),
})

const pinIdSchema = z.string().min(1).max(64)

interface PinOwnerRow {
  user_id: string | null

  created_at: string

  hidden: number
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const parsedId = pinIdSchema.safeParse(params.id)

  if (!parsedId.success) {
    return errorResponse(400, "invalid_pin_id", "The pin ID is invalid.")
  }

  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Only approved alumni can move notes.")
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

  const parsed = positionInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(
      400,

      "invalid_position",

      "The pin position is invalid.",
    )
  }

  const wallDate = getManilaDate()

  const now = new Date()

  const nowMs = now.getTime()

  const nowIso = now.toISOString()

  const cutoff = new Date(nowMs - WALL_CONFIG.pinMoveWindowMs).toISOString()

  const moderator = isAdmin(user)

  try {
    const pin = await env.DB.prepare(
      `SELECT user_id, created_at, hidden
       FROM pins
       WHERE id = ? AND wall_date = ? AND status = 'active'`,
    )

      .bind(parsedId.data, wallDate)

      .first<PinOwnerRow>()

    if (!pin || pin.hidden === 1) {
      return errorResponse(
        404,

        "pin_not_found",

        "This note is not on today's wall.",
      )
    }

    const isOwner = pin.user_id !== null && pin.user_id === user.id

    if (!moderator) {
      if (!isOwner) {
        return errorResponse(
          403,

          "not_pin_owner",

          "Only the person who posted this note can move it.",
        )
      }

      const createdAt = Date.parse(pin.created_at)

      if (
        !Number.isFinite(createdAt) ||
        createdAt > nowMs ||
        nowMs - createdAt > WALL_CONFIG.pinMoveWindowMs
      ) {
        return errorResponse(
          403,

          "move_window_expired",

          "Notes can only be moved within 10 minutes of posting.",
        )
      }
    }

    const ownerClause = moderator ? "" : " AND user_id = ? AND created_at >= ? AND created_at <= ?"
    const binds: (string | number)[] = [
      (parsed.data.x / WALL_CONFIG.logicalCanvasWidth) * 100,
      (parsed.data.y / WALL_CONFIG.logicalCanvasHeight) * 100,
      nowIso,
      parsedId.data,
      wallDate,
    ]

    if (!moderator) binds.push(user.id, cutoff, nowIso)

    const result = await env.DB.prepare(
      `UPDATE pins
       SET x_pct = ?, y_pct = ?, moved_at = ?
       WHERE id = ? AND wall_date = ? AND status = 'active' AND hidden = 0${ownerClause}`,
    )
      .bind(...binds)
      .run()

    if (result.meta.changes !== 1) {
      return errorResponse(
        409,

        "position_update_rejected",

        "The note can no longer be moved.",
      )
    }

    if (moderator && !isOwner) {
      await env.DB.prepare(
        `INSERT INTO moderation_audit (
           id, actor_user_id, action, target_pin_id, target_user_id, details_json, created_at
         ) VALUES (?, ?, 'pin_moved_by_admin', ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          user.id,
          parsedId.data,
          pin.user_id,
          JSON.stringify({ wallDate, x: parsed.data.x, y: parsed.data.y }),
          nowIso,
        )
        .run()
    }

    return jsonResponse(
      {
        id: parsedId.data,

        x: parsed.data.x,

        y: parsed.data.y,

        movedAt: nowIso,
      },

      200,
    )
  } catch (error) {
    logApiError("PATCH /api/pins/:id/position", error)

    return errorResponse(
      500,

      "position_unavailable",

      "The note position could not be saved.",
    )
  }
}
