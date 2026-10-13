import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import { WALL_CONFIG } from "../../../config"

import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"

import { getSessionUser, isAdmin, isApproved, verifyCsrfRequest } from "../../../lib/auth"

export const prerender = false

const pinIdSchema = z.string().min(1).max(64)

const editInputSchema = z.object({ body: z.string().trim().min(1).max(220) })

interface PinEditRow {
  user_id: string | null
  created_at: string
  hidden: number
}

interface PinDeleteRow {
  id: string
  user_id: string | null
  wall_date: string
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const parsedId = pinIdSchema.safeParse(params.id)

  if (!parsedId.success) return errorResponse(400, "invalid_pin_id", "The pin ID is invalid.")

  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Only approved alumni can edit notes.")
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

  const parsed = editInputSchema.safeParse(body)

  if (!parsed.success) return errorResponse(400, "invalid_note", "The note text is invalid.")

  try {
    const pin = await env.DB.prepare(
      `SELECT user_id, created_at, hidden FROM pins WHERE id = ? AND status = 'active'`,
    )
      .bind(parsedId.data)
      .first<PinEditRow>()

    if (!pin || pin.hidden === 1) {
      return errorResponse(404, "pin_not_found", "This note is no longer available.")
    }

    if (pin.user_id === null || pin.user_id !== user.id) {
      return errorResponse(403, "not_pin_owner", "Only the person who posted this note can edit it.")
    }

    const createdAt = Date.parse(pin.created_at)
    const nowMs = Date.now()

    if (
      !Number.isFinite(createdAt) ||
      createdAt > nowMs ||
      nowMs - createdAt > WALL_CONFIG.pinEditWindowMs
    ) {
      return errorResponse(403, "edit_window_expired", "Notes can only be edited within 10 minutes of posting.")
    }

    const activity = await env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM reactions WHERE pin_id = ?) AS reaction_count,
         (SELECT COUNT(*) FROM reports WHERE pin_id = ?) AS report_count`,
    )
      .bind(parsedId.data, parsedId.data)
      .first<{ reaction_count: number; report_count: number }>()

    if (!activity) throw new Error("Unable to check note activity.")

    if (activity.reaction_count > 0 || activity.report_count > 0) {
      return errorResponse(
        409,
        "note_locked_by_activity",
        "Notes with reactions or reports can no longer be edited.",
      )
    }

    const nowIso = new Date().toISOString()
    const signature = user.codename ?? undefined

    const updated = await env.DB.prepare(
      `UPDATE pins SET body = ?, edited_at = ?${signature ? ", author_name = ?" : ""}
       WHERE id = ? AND user_id = ? AND status = 'active' AND hidden = 0
         AND created_at >= ? AND created_at <= ?
         AND NOT EXISTS (SELECT 1 FROM reactions WHERE pin_id = ?)
         AND NOT EXISTS (SELECT 1 FROM reports WHERE pin_id = ?)`,
    )
      .bind(
        ...(signature
          ? [parsed.data.body, nowIso, signature, parsedId.data, user.id]
          : [parsed.data.body, nowIso, parsedId.data, user.id]),
        new Date(nowMs - WALL_CONFIG.pinEditWindowMs).toISOString(),
        nowIso,
        parsedId.data,
        parsedId.data,
      )
      .run()

    if (updated.meta.changes !== 1) {
      return errorResponse(409, "edit_rejected", "This note can no longer be edited.")
    }

    return jsonResponse({ id: parsedId.data, body: parsed.data.body, editedAt: nowIso })
  } catch (error) {
    logApiError("PATCH /api/pins/:id", error)

    return errorResponse(500, "edit_unavailable", "The note could not be edited.")
  }
}

export const DELETE: APIRoute = async ({ params, request }) => {
  const parsedId = pinIdSchema.safeParse(params.id)

  if (!parsedId.success) return errorResponse(400, "invalid_pin_id", "The pin ID is invalid.")

  const user = await getSessionUser(request)

  if (!user) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isApproved(user)) {
    return errorResponse(403, "approval_required", "Only approved alumni can delete notes.")
  }

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  const moderator = isAdmin(user)

  try {
    const pin = await env.DB.prepare(
      `SELECT id, user_id, wall_date FROM pins WHERE id = ? AND status = 'active'`,
    )
      .bind(parsedId.data)
      .first<PinDeleteRow>()

    if (!pin) return errorResponse(404, "pin_not_found", "This note is no longer available.")

    const isOwner = pin.user_id !== null && pin.user_id === user.id

    if (!moderator && !isOwner) {
      return errorResponse(403, "not_pin_owner", "Only the person who posted this note can delete it.")
    }

    const nowIso = new Date().toISOString()

    await env.DB.batch([
      env.DB.prepare(`DELETE FROM reactions WHERE pin_id = ?`).bind(pin.id),
      env.DB.prepare(`DELETE FROM reports WHERE pin_id = ?`).bind(pin.id),
      env.DB.prepare(
        moderator
          ? `DELETE FROM pins WHERE id = ? AND status = 'active'`
          : `DELETE FROM pins WHERE id = ? AND user_id = ? AND status = 'active'`,
      ).bind(...(moderator ? [pin.id] : [pin.id, user.id])),
      env.DB.prepare(
        `INSERT INTO walls (wall_date, pin_count, finalized_at)
         SELECT ?, COUNT(*), NULL FROM pins
         WHERE wall_date = ? AND status = 'active' AND hidden = 0
         ON CONFLICT(wall_date) DO UPDATE SET pin_count = excluded.pin_count`,
      ).bind(pin.wall_date, pin.wall_date),
      ...(moderator && !isOwner
        ? [
            env.DB.prepare(
              `INSERT INTO moderation_audit (
                 id, actor_user_id, action, target_pin_id, target_user_id, details_json, created_at
               ) VALUES (?, ?, 'pin_deleted_by_admin', ?, ?, ?, ?)`,
            ).bind(
              crypto.randomUUID(),
              user.id,
              pin.id,
              pin.user_id,
              JSON.stringify({ wallDate: pin.wall_date }),
              nowIso,
            ),
          ]
        : []),
    ])

    return jsonResponse({ id: pin.id, wallDate: pin.wall_date })
  } catch (error) {
    logApiError("DELETE /api/pins/:id", error)

    return errorResponse(500, "delete_unavailable", "The note could not be deleted.")
  }
}
