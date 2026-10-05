import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import { WALL_CONFIG } from "../../../../config"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../../lib/api-response"

import { hashOwnerToken } from "../../../../lib/owner-hash"

import { getManilaDate } from "../../../../lib/wall-date"

export const prerender = false

const positionInputSchema = z.object({
  deviceToken: z.string().regex(/^[a-f0-9]{64}$/),

  x: z.number().min(0).max(WALL_CONFIG.logicalCanvasWidth),

  y: z.number().min(0).max(WALL_CONFIG.logicalCanvasHeight),
})

const pinIdSchema = z.string().min(1).max(64)

interface PinOwnerRow {
  owner_hash: string

  created_at: string
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const parsedId = pinIdSchema.safeParse(params.id)

  if (!parsedId.success) {
    return errorResponse(400, "invalid_pin_id", "The pin ID is invalid.")
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

  if (!env.OWNER_HASH_SALT) {
    return errorResponse(
      500,

      "server_misconfigured",

      "The note position could not be saved.",
    )
  }

  const wallDate = getManilaDate()

  const now = new Date()

  const nowMs = now.getTime()

  const nowIso = now.toISOString()

  const cutoff = new Date(nowMs - WALL_CONFIG.pinMoveWindowMs).toISOString()

  try {
    const ownerHash = await hashOwnerToken(
      parsed.data.deviceToken,

      env.OWNER_HASH_SALT,
    )

    const pin = await env.DB.prepare(
      `SELECT owner_hash, created_at
       FROM pins
       WHERE id = ? AND wall_date = ? AND status = 'active'`,
    )

      .bind(parsedId.data, wallDate)

      .first<PinOwnerRow>()

    if (!pin) {
      return errorResponse(
        404,

        "pin_not_found",

        "This note is not on today's wall.",
      )
    }

    if (pin.owner_hash !== ownerHash) {
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

    const result = await env.DB.prepare(
      `UPDATE pins
       SET x_pct = ?, y_pct = ?, moved_at = ?
       WHERE id = ? AND wall_date = ? AND owner_hash = ? AND status = 'active'
         AND created_at >= ? AND created_at <= ?`,
    )

      .bind(
        (parsed.data.x / WALL_CONFIG.logicalCanvasWidth) * 100,

        (parsed.data.y / WALL_CONFIG.logicalCanvasHeight) * 100,

        nowIso,

        parsedId.data,

        wallDate,

        ownerHash,

        cutoff,

        nowIso,
      )

      .run()

    if (result.meta.changes !== 1) {
      return errorResponse(
        409,

        "position_update_rejected",

        "The note can no longer be moved.",
      )
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
