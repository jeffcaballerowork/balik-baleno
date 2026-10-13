import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import { AUTH_CONFIG } from "../../../config"
import { errorResponse, jsonResponse, logApiError } from "../../../lib/api-response"
import { codenameSchema, getSessionUser, isApproved, serializeUser, verifyCsrfRequest } from "../../../lib/auth"

export const prerender = false

const codenameInputSchema = z.object({ codename: codenameSchema })

export const POST: APIRoute = async ({ request }) => {
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

  const parsed = codenameInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_codename",
      `Your codename must be ${AUTH_CONFIG.codenameMinLength} to ${AUTH_CONFIG.codenameMaxLength} characters and use only letters, numbers, spaces, hyphens, or underscores.`,
    )
  }

  const codename = parsed.data.codename.trim()

  try {
    const now = new Date()
    const nowIso = now.toISOString()

    const existing = await env.DB.prepare(
      `SELECT id, codename, codename_updated_at
       FROM users WHERE id = ?`,
    )
      .bind(user.id)
      .first<{ id: string; codename: string | null; codename_updated_at: string | null }>()

    if (!existing) return errorResponse(404, "user_not_found", "That account no longer exists.")

    if (existing.codename !== null) {
      if (existing.codename.toLowerCase() === codename.toLowerCase()) {
        return jsonResponse({ user: serializeUser({ ...user, codename: existing.codename }) })
      }

      const lastChange = existing.codename_updated_at ? Date.parse(existing.codename_updated_at) : NaN

      if (
        Number.isFinite(lastChange) &&
        now.getTime() - lastChange < AUTH_CONFIG.codenameChangeCooldownMs
      ) {
        return errorResponse(
          429,
          "codename_change_limited",
          "Your codename can only be changed once every 7 days.",
        )
      }
    }

    const updated = await env.DB.prepare(
      `UPDATE users
       SET codename = ?, codename_updated_at = ?, updated_at = ?
       WHERE id = ?
         AND NOT EXISTS (
           SELECT 1 FROM users
           WHERE codename IS NOT NULL AND codename = ? COLLATE NOCASE AND id != ?
         )`,
    )
      .bind(codename, nowIso, nowIso, user.id, codename, user.id)
      .run()

    if (updated.meta.changes !== 1) {
      return errorResponse(409, "codename_taken", "That codename is already taken.")
    }

    return jsonResponse({ user: serializeUser({ ...user, codename }) })
  } catch (error) {
    logApiError("POST /api/auth/codename", error)

    return errorResponse(500, "codename_unavailable", "Your codename could not be saved.")
  }
}
