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

export const prerender = false

const pinIdSchema = z.string().min(1).max(64)

const reportInputSchema = z.object({
  deviceToken: z.string().regex(/^[a-f0-9]{64}$/),
})

export const POST: APIRoute = async ({ params, request }) => {
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

  const parsed = reportInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_report",
      "The report details are invalid.",
    )
  }

  if (!env.OWNER_HASH_SALT) {
    return errorResponse(
      500,
      "server_misconfigured",
      "The report could not be submitted.",
    )
  }

  try {
    const reportId = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const reporterHash = await hashOwnerToken(
      parsed.data.deviceToken,
      env.OWNER_HASH_SALT,
    )
    const result = await env.DB.prepare(
      `INSERT INTO reports (id, pin_id, reporter_hash, created_at)
       SELECT ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM pins WHERE id = ? AND status = 'active'
       )
       ON CONFLICT DO NOTHING`,
    )
      .bind(
        reportId,
        parsedId.data,
        reporterHash,
        createdAt,
        parsedId.data,
      )
      .run()

    if (result.meta.changes !== 1) {
      const existing = await env.DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM pins WHERE id = ? AND status = 'active') AS pin_exists,
           (SELECT COUNT(*) FROM reports
            WHERE pin_id = ? AND reporter_hash = ?) AS already_reported`,
      )
        .bind(parsedId.data, parsedId.data, reporterHash)
        .first<{ pin_exists: number; already_reported: number }>()

      if (!existing || existing.pin_exists === 0) {
        return errorResponse(
          404,
          "pin_not_found",
          "This note is no longer available.",
        )
      }

      if (existing.already_reported > 0) {
        return errorResponse(
          409,
          "already_reported",
          "You have already reported this note.",
        )
      }

      throw new Error("The report was not recorded.")
    }

    const reporterCount = await env.DB.prepare(
      `SELECT COUNT(DISTINCT reporter_hash) AS distinct_reporters
       FROM reports WHERE pin_id = ?`,
    )
      .bind(parsedId.data)
      .first<{ distinct_reporters: number }>()

    let hidden = false

    if (
      reporterCount &&
      reporterCount.distinct_reporters >= WALL_CONFIG.reportHideThreshold
    ) {
      const hide = await env.DB.prepare(
        `UPDATE pins SET hidden = 1
         WHERE id = ? AND status = 'active' AND hidden = 0`,
      )
        .bind(parsedId.data)
        .run()

      hidden = hide.meta.changes === 1
    }

    return jsonResponse(
      {
        id: reportId,
        pinId: parsedId.data,
        createdAt,
        hidden,
      },
      201,
    )
  } catch (error) {
    logApiError("POST /api/pins/:id/report", error)

    return errorResponse(
      500,
      "report_unavailable",
      "The report could not be submitted.",
    )
  }
}
