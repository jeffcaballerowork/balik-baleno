import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import { errorResponse, jsonResponse, logApiError } from "../../../../lib/api-response"
import { getSessionUser, isAdmin, verifyCsrfRequest } from "../../../../lib/auth"

export const prerender = false

const pinIdSchema = z.string().min(1).max(64)
const reviewInputSchema = z.object({ action: z.enum(["restore", "delete"]) })

interface ReviewTarget {
  id: string
  user_id: string | null
  wall_date: string
  hidden: number
}

export const POST: APIRoute = async ({ params, request }) => {
  const parsedId = pinIdSchema.safeParse(params.id)

  if (!parsedId.success) return errorResponse(400, "invalid_pin_id", "The pin ID is invalid.")

  const actor = await getSessionUser(request)

  if (!actor) return errorResponse(401, "sign_in_required", "Please sign in first.")

  if (!isAdmin(actor)) return errorResponse(403, "admin_required", "Only administrators can review notes.")

  if (!(await verifyCsrfRequest(request))) {
    return errorResponse(403, "csrf_invalid", "This request could not be verified.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be valid JSON.")
  }

  const parsed = reviewInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(400, "invalid_review_action", "Choose whether to restore or delete this note.")
  }

  try {
    const target = await env.DB.prepare(
      `SELECT id, user_id, wall_date, hidden FROM pins WHERE id = ? AND status = 'active'`,
    )
      .bind(parsedId.data)
      .first<ReviewTarget>()

    if (!target) return errorResponse(404, "pin_not_found", "That note no longer exists.")

    const nowIso = new Date().toISOString()

    if (parsed.data.action === "restore") {
      if (target.hidden === 0) {
        return errorResponse(409, "note_not_hidden", "That note is already visible.")
      }

      await env.DB.batch([
        env.DB.prepare(`UPDATE pins SET hidden = 0 WHERE id = ? AND status = 'active'`).bind(target.id),
        env.DB.prepare(`DELETE FROM reports WHERE pin_id = ?`).bind(target.id),
        env.DB.prepare(
          `INSERT INTO moderation_audit (
             id, actor_user_id, action, target_pin_id, target_user_id, details_json, created_at
           ) VALUES (?, ?, 'pin_restored', ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          actor.id,
          target.id,
          target.user_id,
          JSON.stringify({ wallDate: target.wall_date }),
          nowIso,
        ),
      ])

      return jsonResponse({ id: target.id, hidden: false })
    }

    await env.DB.batch([
      env.DB.prepare(`DELETE FROM reactions WHERE pin_id = ?`).bind(target.id),
      env.DB.prepare(`DELETE FROM reports WHERE pin_id = ?`).bind(target.id),
      env.DB.prepare(`DELETE FROM pins WHERE id = ? AND status = 'active'`).bind(target.id),
      env.DB.prepare(
        `INSERT INTO walls (wall_date, pin_count, finalized_at)
         SELECT ?, COUNT(*), NULL FROM pins
         WHERE wall_date = ? AND status = 'active' AND hidden = 0
         ON CONFLICT(wall_date) DO UPDATE SET pin_count = excluded.pin_count`,
      ).bind(target.wall_date, target.wall_date),
      env.DB.prepare(
        `INSERT INTO moderation_audit (
           id, actor_user_id, action, target_pin_id, target_user_id, details_json, created_at
         ) VALUES (?, ?, 'pin_deleted_by_admin', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        actor.id,
        target.id,
        target.user_id,
        JSON.stringify({ wallDate: target.wall_date }),
        nowIso,
      ),
    ])

    return jsonResponse({ id: target.id, deleted: true })
  } catch (error) {
    logApiError("POST /api/admin/reports/:id", error)

    return errorResponse(500, "review_unavailable", "This note could not be reviewed.")
  }
}
